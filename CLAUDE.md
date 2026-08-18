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
npm run model    # ręczne ściągnięcie modelu do public/imgly/
```

`predev`/`prebuild`/`prepreview` odpalają `npm run model` automatycznie.

## Układ plików

| Plik | Zawartość |
|---|---|
| `index.html` | cała struktura strony, w tym stopka licencyjna |
| `src/main.js` | logika: wczytanie pliku, pasek postępu, wywołanie `removeBackground`, pobieranie |
| `src/style.css` | style |
| `scripts/pobierz-model.mjs` | ściąga model + silnik ONNX do `public/imgly/` przed buildem |

`dist/`, `node_modules/`, `public/imgly/` i `.claude/settings.local.json` są w `.gitignore`.

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

## Język wizualny (od 18.08.2026)

Punkt wyjścia: **mata do cięcia na stole retuszera**. Stąd zielony półton tła
(`--mata: #2c574a`) z nadrukowaną siatką, ciemniejsze „studnie" na pole zrzutu
i ramki wyniku, oraz jeden akcent — pomarańcz trzonka skalpela (`--ostrze`).

- **Pomarańcz tylko jako plama i kreska.** Na macie ma kontrast 2,9:1, więc jako
  tekst wolno go użyć wyłącznie w ciemnej studni (tam 5:1).
- **Dwie sygnatury, obie z tego samego świata.** W nagłówku słowo „TŁA" jest
  wypełnione szachownicą przezroczystości (`background-clip: text`) — tło zostało
  z niego usunięte. W trakcie liczenia wokół pustej ramki wyniku maszeruje linia
  cięcia (klasa `.ciecie`, keyframes `mrowki`) — to zaznaczenie z programu
  graficznego, a nie kolejny nijaki spinner.
- Linia cięcia jest rysowana **czterema gradientami tła**, nie `border: dashed` —
  tylko tak da się ją animować. Maszeruje krokowo (`steps(6)`), bo płynny przesuw
  `background-position` przemalowuje całą ramkę 60 razy na sekundę dokładnie
  wtedy, gdy telefon liczy model.
- **Że trwa cięcie, wie `main.js`** — nakłada na `#results` klasę `.tnie` na czas
  `removeBackground`. Nie wyprowadzaj tego z widoczności `#status`: pasek jest
  widoczny także podczas pobierania modelu.
- Szachownicę przezroczystości rysuje jedna klasa `.szachownica-wzor`,
  parametryzowana przez `--kratka`, `--bok` i `--pol-boku`.
- Pasek postępu ma podziałkę co 10%, żeby czytało się go jak linijkę.
- Fonty (Archivo Variable na szyld, IBM Plex Sans/Mono na treść i odczyty) idą
  z `@fontsource`, czyli **z naszego hostingu**. Google Fonts odpada: strona
  obiecuje, że nic nie wychodzi na zewnątrz, i to dotyczy też fontów.
  Importujemy wejścia **per subset** (`latin-400.css`, `latin-ext-400.css`…);
  wejścia zbiorcze pakietów wrzucają do `dist/` jeszcze cyrylicę, grekę
  i wietnamski, których nikt nigdy nie pobierze.
- Pole zrzutu to `label` z fokusowalnym `input`em (klasa `.plik`), a nie `div`
  z `role="button"` — Enter, spacja i nazwa dla czytnika ekranu są wtedy
  darmowe. Stan fokusu łapie `:focus-within`.
- Kompaktowanie pola zrzutu po pierwszym zdjęciu robi `:has(~ #results...)`.
  W starych Safari `:has` nie zadziała i pole zostanie duże — to akceptowalne.

## Model — dlaczego hostujemy go u siebie

Domyślny model biblioteki to `isnet_fp16` (84 MB), do tego 11 MB silnika ONNX.
Razem 95 MB do pobrania przy pierwszym wejściu.

**Uwaga na pomiary prędkości.** Pojedyncze połączenie do `staticimgly.com` daje
ok. 80 kB/s, do Cloudflare ok. 145 kB/s — ale to **nie jest** różnica między CDN-ami.
Przy 6 połączeniach równolegle oba wychodzą na ~600 kB/s, czyli w łącze testowej
maszyny (~5 Mbit/s). Nie wyciągaj z pojedynczego `curl`-a wniosku o CDN-ie; biblioteka
i tak ciągnie kawałki równolegle. Realny zysk z self-hostingu to **kontrola nad
nagłówkami cache** i nielimitowany transfer, a nie sama prędkość.

Właściwa oszczędność jest w rozmiarze: 95 MB → 53 MB.

Dlatego:

- bierzemy `isnet_quint8` (42 MB, w konfiguracji `model: "small"`),
- `scripts/pobierz-model.mjs` ściąga go razem z silnikiem ONNX (11 MB)
  do `public/imgly/`, a `publicPath` wskazuje na `/imgly/` — czyli na Cloudflare,
- większe modele zostają na CDN-ie img.ly, sięga po nie `?model=medium|large`.
  Jeśli kiedyś mają być hostowane u nas, dopisz je do `HOSTED` w skrypcie.

`resources.json` zapisujemy okrojony do hostowanych wpisów — dzięki temu pomyłka
w `publicPath` daje czytelny błąd, a nie 404 na losowym kawałku. Skrypt przepisuje
też nazwy kawałków na `chunks/<skrót>`, żeby dało się je objąć regułą z `public/_headers`.

**Cache.** Cloudflare Pages domyślnie daje statykom `max-age=0, must-revalidate`.
Dla kawałków modelu to zła wiadomość — telefon kasuje je z cache'u i ściąga 53 MB
od nowa. `public/_headers` ustawia im `max-age=31536000, immutable`; wolno, bo nazwa
pliku jest skrótem jego treści. `resources.json` zostaje na domyślnym rewalidowaniu,
bo to on jest manifestem i musi się dać podmienić.

## Rzeczy, o których warto pamiętać

- **Pierwsze uruchomienie w przeglądarce trwa** — do ściągnięcia jest ~53 MB.
  To nie jest bug. Potem pliki siedzą w cache i nie są ściągane ponownie.
- **Kolejne zdjęcia i tak nie są natychmiastowe.** `removeBackground` tworzy nową
  sesję ONNX przy każdym wywołaniu, czyli parsuje 42 MB modelu od zera. Na maszynie
  deweloperskiej mierzone przebiegi z cache'u szły od ok. 8 s do ok. 40 s. Gdyby
  to zaczęło przeszkadzać, trzeba by trzymać sesję między zdjęciami — biblioteka
  tego nie wystawia, więc oznaczałoby to zejście na `onnxruntime-web` bezpośrednio.
- Callback `progress` z biblioteki rozróżnia fazy po prefiksie `fetch` w kluczu —
  stąd różne etykiety na pasku postępu.
- **Biblioteka zgłasza postęp dopiero po całym kawałku ~4 MB**, nie po bajtach.
  Dlatego w `main.js` jest ticker (`setPhase`/`render`) dokładający do etykiety
  liczbę sekund i pasek nieokreślony do pierwszego zdarzenia — bez tego zamrożony
  pasek wygląda na zawieszkę. To był oryginalny objaw zgłoszony jako „stoi na 0%".
- Na telefonie (`isMobile`) zdjęcie jest zmniejszane do 1600 px przed przetwarzaniem
  — model i tak pracuje na 1024 px, a dekodowanie 12 Mpx zjada tam za dużo pamięci.
  Skutek uboczny: wynikowy PNG z telefonu ma max 1600 px. Na desktopie bez zmian.
- Blok `#diag` pod komunikatem błędu pokazuje model, pamięć i UA — na telefonie
  nie ma konsoli, więc to jedyny sposób, żeby użytkownik przysłał coś konkretnego.
- W `dist/` siedzi `ort-wasm-simd-threaded.jsep-*.wasm` (~24 MB) wrzucony przez
  Vite z `onnxruntime-web`. W czasie działania **nie jest używany** — biblioteka
  nadpisuje `ort.env.wasm.wasmPaths` blobami z `publicPath`. Da się go pewnie
  wyciąć z builda i skrócić deploy, ale nikt tego jeszcze nie sprawdził.

## Hosting

Strona stoi na **Cloudflare Pages**, projekt `usuwanie-tla`, adres produkcyjny:
<https://usuwanie-tla.pages.dev/>. Wdrożenie idzie **direct upload**, nie z repo:

```bash
npm run build
npx -y wrangler pages deploy dist --project-name=usuwanie-tla --branch=main --commit-dirty=true
```

Wybraliśmy Cloudflare zamiast Netlify ze względu na nielimitowany transfer, i to
się opłaciło podwójnie: od 15.08.2026 model i silnik ONNX (~54 MB w `dist/imgly/`)
też idą z naszego hostingu. Pierwsze wejście użytkownika to ok. 53 MB.

`dist/` waży ~79 MB, bo dochodzi jeszcze nieużywany `ort-wasm-simd-threaded.jsep-*.wasm`
(~24 MB) — patrz uwaga wyżej.

Upload trwa **kilka minut** i **przekracza limit pojedynczej komendy** — puszczaj
deploy w tle, inaczej dostaniesz timeout i pusty wynik (tak umarła pierwsza próba:
exit 58, brak deploymentu, `pages.dev` zwracał 522).

## Stan prac (15.08.2026)

Zgłoszenie: na komputerze działa bez zarzutu, na telefonie pasek stoi na 0%
i zdjęcie nigdy się nie przetwarza.

**Która z poprawek faktycznie odblokowała telefon — nie wiadomo.** Pierwsza
diagnoza („CDN img.ly jest wolny") okazała się błędna po dokładniejszym pomiarze,
patrz sekcja o modelu. Prawdopodobne przyczyny, wszystkie zaadresowane: 95 MB do
pobrania, brak widocznego postępu (użytkownik nie miał jak odróżnić „ładuje się"
od „zawiesiło"), limit pamięci karty na telefonie, brak cache'owania między wizytami.

Zrobione:

- **self-hosting modelu** (`scripts/pobierz-model.mjs` + `publicPath: /imgly/`),
  model `isnet_quint8` zamiast `isnet_fp16` — 95 MB → 53 MB,
- **wieczny cache na kawałki modelu** (`public/_headers`),
- **uczciwy pasek postępu** — ticker z licznikiem sekund i pasek nieokreślony,
- **zmniejszanie zdjęcia do 1600 px na telefonie**,
- **blok diagnostyczny** `#diag` pod błędem,
- puste `file.type` (część androidowych wybieraków) już nie jest odrzucane.

Sprawdzone na produkcji <https://usuwanie-tla.pages.dev/>: pełny przebieg przechodzi,
rogi mają alfę 0, obiekt zostaje nienaruszony, nazwa pliku poprawna. Pierwsze wejście
zeszło 453 s na łączu ~5 Mbit/s, drugie zdjęcie już bez pobierania. Nagłówki
zweryfikowane `curl`-em: kawałki `immutable`, `resources.json` rewalidowany.
Układ ze ścieżkami `chunks/` przetestowany na zbudowanej wersji.

**Niesprawdzone: prawdziwy telefon.** Trzeba dać zgłaszającemu przetestować na jego
urządzeniu; gdyby dalej nie działało, `#diag` pod błędem pokaże model, pamięć i etap.
Otwarte też, czy `isnet_quint8` nie psuje jakości względem `isnet_fp16` — nikt nie
porównał ich na prawdziwym zdjęciu, testy szły na syntetycznych kształtach.

Tematy leżące dalej na stole: własna domena firmowa (wymaga dostępu do DNS),
`device: 'gpu'`, wsad wielu zdjęć naraz, wycięcie nieużywanego `.jsep.wasm`
z builda.
