# Usuwanie tła

Prosta strona do usuwania tła ze zdjęć. Wrzucasz obrazek, dostajesz PNG z przezroczystym tłem.

Całość liczy się **w przeglądarce** — model AI (U²-Net) działa przez WebAssembly, a zdjęcia
nigdy nie trafiają na żaden serwer. Nie ma backendu; aplikacja to zbiór plików statycznych.

## Użycie

Przeciągnij zdjęcie na pole, kliknij żeby wybrać plik, albo wklej przez `Ctrl+V`.
Po przetworzeniu pobierasz wynik przyciskiem **Pobierz PNG**.

**Pierwsze uruchomienie trwa** — przeglądarka ściąga model (~40 MB), co może zająć
i kilka minut. Potem model siedzi w cache i kolejne zdjęcia idą w kilka sekund.

Wymagana aktualna wersja Chrome, Edge lub Firefox.

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

`dist/` to zwykłe pliki statyczne — można je serwować z czegokolwiek.

## Licencja

AGPL-3.0 — pełny tekst w pliku [LICENSE](LICENSE).

Aplikacja korzysta z [@imgly/background-removal](https://github.com/imgly/background-removal-js),
również na licencji AGPL-3.0. Oznacza to, że każdy, kto korzysta z tej aplikacji przez sieć,
ma prawo otrzymać jej kod źródłowy — stąd publiczne repozytorium i link w stopce strony.

Jeśli kiedykolwiek zajdzie potrzeba zamknięcia źródeł, IMG.LY sprzedaje licencję komercyjną
znoszącą ten wymóg.
