import { removeBackground } from "@imgly/background-removal";

const dropEl = document.querySelector("#drop");
const fileEl = document.querySelector("#file");
const statusEl = document.querySelector("#status");
const statusTextEl = document.querySelector("#status-text");
const barEl = document.querySelector("#bar");
const barFillEl = document.querySelector("#bar-fill");
const resultsEl = document.querySelector("#results");
const beforeEl = document.querySelector("#before");
const afterEl = document.querySelector("#after");
const actionsEl = document.querySelector("#actions");
const downloadEl = document.querySelector("#download");
const resetEl = document.querySelector("#reset");
const errorEl = document.querySelector("#error");
const errorTextEl = document.querySelector("#error-text");
const diagEl = document.querySelector("#diag");
const diagTextEl = document.querySelector("#diag-text");

// Obiekty URL trzymamy, żeby je zwolnić przy kolejnym zdjęciu.
let objectUrls = [];
let busy = false;
let lastStage = ""; // ostatni etap przetwarzania, do bloku diagnostycznego

// Domyślny model biblioteki (isnet_fp16) waży 84 MB, a CDN img.ly wyrabia
// ok. 80 kB/s na połączenie — telefon nie miał szans tego dociągnąć. Bierzemy
// isnet_quint8 (42 MB) i serwujemy go z własnego hostingu.
// Większe modele zostały na CDN-ie img.ly: ?model=medium|large, wolno ale ostrzej.
const MODEL_ALIAS = { small: "small", medium: "medium", large: "large" };
const model = MODEL_ALIAS[new URLSearchParams(location.search).get("model")] ?? "small";
const MODEL_MB = { small: 42, medium: 84, large: 168 }[model];

// Hostujemy u siebie tylko mały model — patrz scripts/pobierz-model.mjs.
const publicPath = model === "small" ? new URL("/imgly/", location.origin).href : undefined;

const isMobile =
  navigator.userAgentData?.mobile === true ||
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform)) ||
  (navigator.deviceMemory ?? 8) <= 4;

// Model i tak skaluje wejście do 1024 px, a dekodowanie zdjęcia 12 Mpx
// zjada na telefonie kilkadziesiąt MB — zmniejszamy je przed przetwarzaniem.
const MAX_INPUT_PX = 1600;

function trackUrl(blob) {
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}

function releaseUrls() {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
}

// Biblioteka pobiera pliki kawałkami po ~4 MB i zgłasza postęp dopiero po
// całym kawałku. Na łączu komórkowym kolejne zdarzenie potrafi przyjść po
// kilkudziesięciu sekundach, więc do etykiety dokładamy tykający licznik —
// bez niego zamrożony pasek wygląda na zawieszkę.
let ticker = null;
let startedAt = 0;
let phaseLabel = "";
let phaseRatio = null; // null = pasek nieokreślony, jeszcze nie znamy postępu

function render() {
  const s = Math.round((performance.now() - startedAt) / 1000);
  statusEl.hidden = false;
  statusTextEl.textContent = `${phaseLabel} · ${s} s`;
  barEl.classList.toggle("indeterminate", phaseRatio === null);
  // Szerokość musi wrócić do pustej wartości, inaczej styl inline z poprzedniego
  // zdjęcia przebija regułę paska nieokreślonego.
  barFillEl.style.width =
    phaseRatio === null
      ? ""
      : `${Math.round(Math.min(Math.max(phaseRatio, 0), 1) * 100)}%`;
}

function setPhase(label, ratio = null) {
  phaseLabel = label;
  phaseRatio = ratio;
  startedAt = performance.now();
  if (!ticker) ticker = setInterval(render, 1000);
  render();
}

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

function showError(message) {
  errorTextEl.textContent = message;
  errorEl.hidden = false;
  diagTextEl.textContent = diagnostics();
  diagEl.hidden = false;
}

// Na telefonie nie ma konsoli — zrzut środowiska da się zrzucić zrzutem ekranu.
function diagnostics() {
  return [
    `model: ${model} (${MODEL_MB} MB) z ${publicPath ?? "CDN img.ly"}`,
    `mobile: ${isMobile}`,
    `pamięć: ${navigator.deviceMemory ?? "?"} GB, rdzenie: ${navigator.hardwareConcurrency ?? "?"}`,
    `crossOriginIsolated: ${self.crossOriginIsolated}`,
    `ostatni etap: ${lastStage || "brak"}`,
    navigator.userAgent,
  ].join("\n");
}

function reset() {
  stopTicker();
  releaseUrls();
  lastStage = "";
  resultsEl.classList.remove("tnie");
  resultsEl.hidden = true;
  actionsEl.hidden = true;
  statusEl.hidden = true;
  errorEl.hidden = true;
  diagEl.hidden = true;
  fileEl.value = "";
}

// Zwraca mniejszą kopię zdjęcia albo oryginał, jeśli nie da się go zdekodować
// (np. HEIC, którego przeglądarka nie zna) — wtedy próbuje sama biblioteka.
// Na desktopie nie ruszamy niczego: tam pamięci starczy i wynik ma zostać
// w pełnej rozdzielczości.
async function downscale(file) {
  if (!isMobile) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_INPUT_PX / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // JPEG tylko dla zdjęć — PNG może mieć alfę, której JPEG by nie udźwignął.
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((done) => canvas.toBlob(done, type, 0.92));
  // iOS nie zwalnia bufora canvasa od razu — zerowe wymiary go wymuszają.
  canvas.width = canvas.height = 0;
  return blob ?? file;
}

// Pierwsze uruchomienie ściąga silnik ONNX i model; potem lecą z cache.
async function process(file) {
  if (busy) return;
  // Część androidowych wybieraków plików nie ustawia typu MIME — pusty typ
  // przepuszczamy i niech zdecyduje dekoder.
  if (!file || (file.type && !file.type.startsWith("image/"))) {
    lastStage = `odrzucony plik typu "${file?.type || "?"}"`;
    showError("To nie wygląda na plik graficzny. Wybierz JPG, PNG albo WEBP.");
    return;
  }

  busy = true;
  reset();
  resultsEl.hidden = false;
  // Wokół pustej ramki maszeruje linia cięcia dopóki trwa przetwarzanie.
  resultsEl.classList.add("tnie");
  afterEl.removeAttribute("src");
  lastStage = "przygotowanie";
  setPhase("Przygotowuję");

  try {
    const input = await downscale(file);
    beforeEl.src = trackUrl(input);

    setPhase(`Pobieram model (~${MODEL_MB} MB)`);
    const blob = await removeBackground(input, {
      model,
      ...(publicPath ? { publicPath } : {}),
      progress: (key, current, total) => {
        lastStage = key;
        const ratio = total ? current / total : 0;
        // Klucze pobierania mają prefiks `fetch:`; reszta to już liczenie.
        if (!key.startsWith("fetch")) {
          setPhase("Przetwarzam", ratio);
          return;
        }
        const what = key.includes("/models/") ? "model" : "silnik";
        const mb = (n) => (n / 1048576).toFixed(0);
        setPhase(`Pobieram ${what} ${mb(current)} / ${mb(total)} MB`, ratio);
      },
    });

    stopTicker();
    const url = trackUrl(blob);
    afterEl.src = url;
    downloadEl.href = url;
    downloadEl.download = file.name.replace(/\.[^.]+$/, "") + "-bez-tla.png";
    actionsEl.hidden = false;
    statusEl.hidden = true;
  } catch (err) {
    console.error(err);
    stopTicker();
    showError(`Nie udało się usunąć tła: ${err?.message ?? err}`);
    statusEl.hidden = true;
  } finally {
    busy = false;
    resultsEl.classList.remove("tnie");
  }
}

// Klikanie i klawiatura idą przez `label` i ukryty wizualnie `input` —
// bez własnego kodu.
fileEl.addEventListener("change", () => process(fileEl.files?.[0]));

["dragenter", "dragover"].forEach((type) =>
  dropEl.addEventListener(type, (e) => {
    e.preventDefault();
    dropEl.classList.add("over");
  }),
);

["dragleave", "drop"].forEach((type) =>
  dropEl.addEventListener(type, (e) => {
    e.preventDefault();
    dropEl.classList.remove("over");
  }),
);

dropEl.addEventListener("drop", (e) => process(e.dataTransfer?.files?.[0]));

document.addEventListener("paste", (e) => {
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
  if (item) process(item.getAsFile());
});

resetEl.addEventListener("click", reset);
