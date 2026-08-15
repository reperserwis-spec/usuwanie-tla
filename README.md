# Usuwanie tła

Prosta strona do usuwania tła ze zdjęć. Wrzucasz obrazek, dostajesz PNG z przezroczystym tłem.

Całość liczy się **w przeglądarce** — model AI (U²-Net) działa przez WebAssembly, a zdjęcia
nigdy nie trafiają na żaden serwer. Nie ma backendu; aplikacja to zbiór plików statycznych.

## Użycie

Przeciągnij zdjęcie na pole, kliknij żeby wybrać plik, albo wklej przez `Ctrl+V`.
Po przetworzeniu pobierasz wynik przyciskiem **Pobierz PNG**.

**Pierwsze uruchomienie trwa** — przeglądarka ściąga model (~42 MB) i silnik ONNX
(~11 MB). Na wolnym łączu to nawet kilka minut; pasek postępu pokazuje, ile już zeszło.
Potem pliki siedzą w cache i nie są ściągane ponownie, a samo przetworzenie zdjęcia
zajmuje od kilku do kilkudziesięciu sekund, zależnie od sprzętu.

Domyślnie leci mały model (`isnet_quint8`). Ostrzejsze warianty można wymusić przez
`?model=medium` (84 MB) albo `?model=large` (168 MB) — te lecą z CDN-u img.ly, więc
pobierają się wolno.

Działa w aktualnym Chrome, Edge, Firefoksie i Safari, również na telefonie.

## Rozwój lokalny

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # wynik ląduje w dist/
npm run preview  # podgląd builda produkcyjnego
```

`predev` i `prebuild` uruchamiają `npm run model`, czyli `scripts/pobierz-model.mjs`.
Skrypt ściąga model i silnik ONNX (~54 MB) do `public/imgly/`, żeby aplikacja
serwowała je z własnego hostingu zamiast z wolnego CDN-u img.ly. Pliki są
w `.gitignore`; skrypt pomija to, co już leży na dysku.

`dist/` to zwykłe pliki statyczne — można je serwować z czegokolwiek.

## Licencja

AGPL-3.0 — pełny tekst w pliku [LICENSE](LICENSE).

Aplikacja korzysta z [@imgly/background-removal](https://github.com/imgly/background-removal-js),
również na licencji AGPL-3.0. Oznacza to, że każdy, kto korzysta z tej aplikacji przez sieć,
ma prawo otrzymać jej kod źródłowy — stąd publiczne repozytorium i link w stopce strony.

Jeśli kiedykolwiek zajdzie potrzeba zamknięcia źródeł, IMG.LY sprzedaje licencję komercyjną
znoszącą ten wymóg.
