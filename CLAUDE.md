# Usuwanie tła

Statyczna strona do usuwania tła ze zdjęć. Użytkownik wrzuca obrazek (drag & drop,
klik, albo `Ctrl+V`) i dostaje PNG z przezroczystym tłem.

**Kluczowa zasada projektu: wszystko liczy się w przeglądarce.** Model U²-Net działa
przez WebAssembly, zdjęcia nigdy nie opuszczają urządzenia. Nie ma backendu i nie ma go
być — to element obietnicy złożonej użytkownikowi w stopce strony.

Folder na dysku: `C:\Users\kacpe\OneDrive\Dokumenty\Kodowanie\usuwanie-tla`.
Każdy projekt ma własny katalog w `Kodowanie\`, nazwany małymi literami z myślnikami —
tak samo jak repo na GitHubie. Do 15.08.2026 ten folder nazywał się `Kurs CC`; jeśli
gdzieś w notatkach albo w konfiguracji wypłynie ta stara nazwa, to jest ślad po zmianie.

## Stos

- Vite 8 + waniliowy JS, bez frameworka i bez TypeScriptu
- [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) — cała robota AI
- Node z `.nvmrc` (24)
- Repo: `origin` → https://github.com/reperserwis-spec/usuwanie-tla

## Komendy

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # podgląd builda
```

## Układ plików

| Plik | Zawartość |
|---|---|
| `index.html` | cała struktura strony, w tym stopka licencyjna |
| `src/main.js` | logika: wczytanie pliku, pasek postępu, wywołanie `removeBackground`, pobieranie |
| `src/style.css` | style |

`dist/`, `node_modules/` i `.claude/settings.local.json` są w `.gitignore`.

## Licencja — nie ruszać stopki

Projekt jest na **AGPL-3.0**, bo taką licencję ma `@imgly/background-removal`.
Stopka w `index.html` (wraz z komentarzem nad nią) spełnia wymogi §5d i §13 AGPL:
informacja o licencji i oferta kodu źródłowego dla użytkowników sieciowych.
Usunięcie jej albo zamknięcie repo złamałoby licencję. Gdyby kiedyś trzeba było zamknąć
źródła — IMG.LY sprzedaje licencję komercyjną znoszącą ten wymóg.

## Konwencje

- Interfejs, README i komentarze w kodzie po polsku.
- Komentarze tylko tam, gdzie wyjaśniają *dlaczego* (np. zwalnianie `objectURL`,
  czas pierwszego pobrania modelu) — nie opisujemy nimi oczywistego kodu.
- Obiekty `URL.createObjectURL` trafiają do tablicy `objectUrls` i są zwalniane
  w `releaseUrls()`. Każdy nowy `createObjectURL` przepuszczaj przez `trackUrl()`.
- Flaga `busy` blokuje równoległe przetwarzanie — nie obchodzić jej.

## Rzeczy, o których warto pamiętać

- **Pierwsze uruchomienie w przeglądarce trwa** — model waży ~40 MB. To nie jest bug.
  Potem siedzi w cache i kolejne zdjęcia idą w kilka sekund.
- Callback `progress` z biblioteki rozróżnia fazy po prefiksie `fetch` w kluczu —
  stąd dwie różne etykiety na pasku postępu.

## Hosting

Strona stoi na **Cloudflare Pages**, projekt `usuwanie-tla`, adres produkcyjny:
<https://usuwanie-tla.pages.dev/>. Wdrożenie idzie **direct upload**, nie z repo:

```bash
npm run build
npx -y wrangler pages deploy dist --project-name=usuwanie-tla --branch=main --commit-dirty=true
```

Wybraliśmy Cloudflare zamiast Netlify ze względu na nielimitowany transfer — build
zawiera `ort-wasm-simd-threaded.jsep-*.wasm` o wadze ~24 MB, który idzie z naszego
hostingu (z CDN-u img.ly leci osobno ~40 MB wag modelu). Pierwsze wejście to więc
ok. 65 MB.

Upload trwa ~2 minuty i **przekracza limit pojedynczej komendy** — puszczaj deploy
w tle, inaczej dostaniesz timeout i pusty wynik (tak umarła pierwsza próba: exit 58,
brak deploymentu, `pages.dev` zwracał 522).

## Stan prac (15.08.2026)

Wdrożone i sprawdzone na produkcji: pełny przebieg (drop → pasek postępu → PNG)
przechodzi, tło ma alfę 0, kształt zostaje nienaruszony, stopka linkuje do
publicznego repo. Kod aplikacji siedzi w commicie `1d0dcdb`; `CLAUDE.md` jest
nowy i jeszcze niezacommitowany.

Kolejne kroki nie były ustalone — przy nowej sesji zapytaj, co robimy dalej,
i dopisz to tutaj. Tematy leżące na stole: własna domena firmowa (wymaga dostępu
do DNS), self-hosting modelu, `device: 'gpu'`, wsad wielu zdjęć naraz.
