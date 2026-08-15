// Ściąga model i silnik ONNX do public/imgly/, żeby strona serwowała je
// z Cloudflare zamiast z CDN-u img.ly. Powód: staticimgly.com daje ok. 80 kB/s
// na połączenie — na telefonie pierwsze zdjęcie nie miało szans się doczekać.
//
// Pliki są w .gitignore i lądują tu przed każdym `npm run dev` / `npm run build`.
// Skrypt jest idempotentny: to, co już leży na dysku w dobrym rozmiarze, pomija.

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "imgly");

// Hostujemy tylko to, czego aplikacja naprawdę używa. isnet_fp16 (84 MB)
// i isnet (168 MB) zostają na CDN-ie img.ly — sięga po nie ?model=medium|large.
const HOSTED = [
  "/models/isnet_quint8",
  "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
  "/onnxruntime-web/ort-wasm-simd-threaded.mjs",
];

const PARALLEL = 8;

async function version() {
  const pkg = join(root, "node_modules", "@imgly", "background-removal", "package.json");
  return JSON.parse(await readFile(pkg, "utf8")).version;
}

async function alreadyThere(path, size) {
  try {
    return (await stat(path)).size === size;
  } catch {
    return false;
  }
}

async function pool(items, worker) {
  const queue = [...items];
  const runners = Array.from({ length: PARALLEL }, async () => {
    let item;
    while ((item = queue.shift())) await worker(item);
  });
  await Promise.all(runners);
}

const base = `https://staticimgly.com/@imgly/background-removal-data/${await version()}/dist/`;
await mkdir(outDir, { recursive: true });

const resources = await fetch(new URL("resources.json", base)).then((r) => {
  if (!r.ok) throw new Error(`resources.json: HTTP ${r.status}`);
  return r.json();
});

// Kawałki lądują w podkatalogu chunks/, żeby dało się im ustawić w public/_headers
// wieczny cache. Nazwa pliku to skrót jego treści, więc nigdy się nie zmieni.
// resources.json zostaje wyżej i normalnie się rewaliduje — to on jest manifestem.
const chunkDir = join(outDir, "chunks");
await mkdir(chunkDir, { recursive: true });

const hosted = {};
const jobs = [];
let totalBytes = 0;

for (const key of HOSTED) {
  const entry = resources[key];
  if (!entry) throw new Error(`Brak wpisu ${key} w resources.json (wersja się rozjechała?)`);
  totalBytes += entry.size;
  hosted[key] = {
    ...entry,
    chunks: entry.chunks.map((chunk) => ({ ...chunk, name: `chunks/${chunk.name}` })),
  };
  for (const chunk of entry.chunks) {
    jobs.push({ name: chunk.name, size: chunk.offsets[1] - chunk.offsets[0] });
  }
}

// resources.json zapisujemy okrojony — gdyby aplikacja poprosiła o niehostowany
// model, ma dostać czytelny błąd, a nie 404 na losowym kawałku.
await writeFile(join(outDir, "resources.json"), JSON.stringify(hosted));

let done = 0;
let pobrane = 0;
console.log(`Model i silnik: ${jobs.length} plików, ${(totalBytes / 1048576).toFixed(1)} MB → public/imgly/`);

await pool(jobs, async ({ name, size }) => {
  const path = join(chunkDir, name);
  if (await alreadyThere(path, size)) {
    done++;
    return;
  }

  const res = await fetch(new URL(name, base));
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length !== size) throw new Error(`${name}: oczekiwano ${size} B, dostano ${buf.length} B`);

  await writeFile(path, buf);
  pobrane++;
  done++;
  console.log(`  ${String(done).padStart(2)}/${jobs.length}  ${name.slice(0, 12)}…`);
});

console.log(pobrane ? `Gotowe — pobrano ${pobrane} plików.` : "Gotowe — wszystko było już na dysku.");
