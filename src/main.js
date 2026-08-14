import { removeBackground } from "@imgly/background-removal";

const dropEl = document.querySelector("#drop");
const fileEl = document.querySelector("#file");
const statusEl = document.querySelector("#status");
const statusTextEl = document.querySelector("#status-text");
const barFillEl = document.querySelector("#bar-fill");
const resultsEl = document.querySelector("#results");
const beforeEl = document.querySelector("#before");
const afterEl = document.querySelector("#after");
const actionsEl = document.querySelector("#actions");
const downloadEl = document.querySelector("#download");
const resetEl = document.querySelector("#reset");
const errorEl = document.querySelector("#error");

// Obiekty URL trzymamy, żeby je zwolnić przy kolejnym zdjęciu.
let objectUrls = [];
let busy = false;

function trackUrl(blob) {
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}

function releaseUrls() {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
}

function setProgress(text, ratio) {
  statusEl.hidden = false;
  statusTextEl.textContent = text;
  barFillEl.style.width = `${Math.round(Math.min(Math.max(ratio, 0), 1) * 100)}%`;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function reset() {
  releaseUrls();
  resultsEl.hidden = true;
  actionsEl.hidden = true;
  statusEl.hidden = true;
  errorEl.hidden = true;
  fileEl.value = "";
}

// Pierwsze uruchomienie ściąga model (~40 MB) i chwilę trwa; potem leci z cache.
async function process(file) {
  if (busy) return;
  if (!file || !file.type.startsWith("image/")) {
    showError("To nie wygląda na plik graficzny.");
    return;
  }

  busy = true;
  reset();
  beforeEl.src = trackUrl(file);
  resultsEl.hidden = false;
  afterEl.removeAttribute("src");
  setProgress("Przygotowuję…", 0.02);

  try {
    const blob = await removeBackground(file, {
      progress: (key, current, total) => {
        const ratio = total ? current / total : 0;
        const label = key.startsWith("fetch") ? "Pobieram model" : "Przetwarzam";
        setProgress(`${label}… ${Math.round(ratio * 100)}%`, ratio);
      },
    });

    const url = trackUrl(blob);
    afterEl.src = url;
    downloadEl.href = url;
    downloadEl.download = file.name.replace(/\.[^.]+$/, "") + "-bez-tla.png";
    actionsEl.hidden = false;
    statusEl.hidden = true;
  } catch (err) {
    console.error(err);
    showError(`Nie udało się usunąć tła: ${err?.message ?? err}`);
    statusEl.hidden = true;
  } finally {
    busy = false;
  }
}

dropEl.addEventListener("click", () => fileEl.click());
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
