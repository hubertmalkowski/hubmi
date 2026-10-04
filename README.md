# Zaczyn

Projekt na HackYeah, wyzwanie ROPS Kraków: Małopolski Hub Innowacji Społecznych.

Mieszkaniec opisuje problem swoimi słowami (np. „nie mam jak dojechać do lekarza”), a my szukamy w Bibliotece Innowacji Społecznych rozwiązań, które gdzieś już zadziałały. Jeżeli nic nie pasuje, zgłoszenie zamienia się w otwarte wyzwanie, na które mogą odpowiedzieć NGO, gminy albo zwykli ludzie z pomysłem. Zespół ROPS ma panel, w którym widzi zgłoszenia, pomysły i trendy.

Zrobiliśmy wszystkie siedem modułów z opisu wyzwania:

| Moduł                                 | Ścieżki                                                    |
| ------------------------------------- | ---------------------------------------------------------- |
| I. Kojarzenie potrzeb z rozwiązaniami | `/`, `/report`, `/report/[id]`                             |
| II. Zasobnik wiedzy                   | `/knowledge`, `/knowledge/library`, `/admin/trends`        |
| III. Kreator innowacji                | `/ideas/new`, `/ideas/[id]/assistant`, `/calls/[id]/apply` |
| IV. Tester innowacji                  | `/tests`                                                   |
| V. Komunikacja                        | `/messages`, strony pomysłów                               |
| VI. Panel ROPS                        | `/admin`                                                   |
| VII. Middleman Innowacji              | `/adapt/[slug]`                                            |

Interfejs jest po polsku, angielsku i ukraińsku. W stopce są ustawienia dostępności (większy tekst, kontrast, tekst łatwy do czytania, czytanie na głos).

## Uruchomienie z danymi demo

Instrukcja krok po kroku. Całość zajmuje około 10 minut, najdłużej trwa pierwsze pobranie obrazów Dockera.

### Krok 0. Zainstaluj potrzebne programy

Potrzebujesz trzech rzeczy:

- **Node.js 22**: pobierz z [nodejs.org](https://nodejs.org). Sprawdź w terminalu: `node -v` powinno pokazać `v22.…`.
- **pnpm 10**: po instalacji Node wpisz `npm install -g pnpm@10`. Sprawdź: `pnpm -v` powinno pokazać `10.…`.
- **Docker**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) na Windows i macOS albo Docker Engine na Linuksie. Docker musi być **uruchomiony**. Sprawdź: `docker info` nie może zwracać błędu.

Upewnij się też, że porty 5432 (Postgres), 9200 (Elasticsearch) i 5173 (aplikacja) są wolne. Jeśli masz lokalnie zainstalowanego Postgresa, zatrzymaj go na czas uruchamiania.

### Krok 1. Pobierz kod

```sh
git clone https://github.com/hubertmalkowski/hubmi.git
cd hubmi
```

Wszystkie kolejne polecenia wpisujesz w tym katalogu.

### Krok 2. Zainstaluj zależności

```sh
pnpm install
```

### Krok 3. Utwórz plik `.env`

Skopiuj przykładowy plik konfiguracyjny:

```sh
cp .env.example .env
```

Na Windows w PowerShellu: `copy .env.example .env`.

Otwórz `.env` w dowolnym edytorze tekstu i wybierz jedną z dwóch opcji:

**Opcja A: bez kluczy API (najprostsza).** Zmień linię `AI_MOCK=0` na:

```
AI_MOCK=1
```

Nic więcej nie trzeba. Aplikacja nie łączy się wtedy z żadnym zewnętrznym API, a zamiast modeli AI używa prostych reguł na słowach kluczowych. Wszystko da się przeklikać, ale dopasowania i teksty są gorszej jakości.

**Opcja B: z kluczami API (pełna jakość).** Zostaw `AI_MOCK=0` i wpisz klucze po znaku `=`:

```
TYPESAFE_API_KEY=twój_klucz      # Jev: klasyfikacja zgłoszeń, moderacja, ocena dopasowania
ANTHROPIC_API_KEY=twój_klucz     # Claude: wyjaśnienia, asystent, wnioski, tłumaczenia
VOYAGE_API_KEY=twój_klucz        # embeddingi do wyszukiwania
```

Pozostałych linii w `.env` nie zmieniaj, domyślne wartości pasują do kroku 4.

### Krok 4. Uruchom bazę danych i wyszukiwarkę

```sh
pnpm es:dict
docker compose up -d --wait db es
```

Pierwsze polecenie kopiuje polski słownik do obrazu Elasticsearch. Drugie uruchamia w Dockerze Postgresa i Elasticsearch i czeka, aż będą gotowe. Za pierwszym razem pobiera i buduje obrazy, więc może to potrwać kilka minut.

Gdy się skończy, powinieneś zobaczyć:

```
 Container hubmi-db-1 Healthy
 Container hubmi-es-1 Healthy
```

### Krok 5. Utwórz tabele i wgraj dane demo

```sh
pnpm db:migrate
pnpm db:seed
```

`db:migrate` tworzy tabele w bazie. `db:seed` wgrywa dane demo: 22 powiaty i 42 gminy, 30 innowacji w Bibliotece, konta demo, dwa nabory grantowe i kampanie testowe. Potem przepuszcza 60 przykładowych zgłoszeń przez ten sam mechanizm dopasowania co prawdziwe zgłoszenia.

Na końcu zobaczysz podsumowanie w tym stylu (liczby mogą się różnić):

```
needs by status: Result(3) [
  { status: 'matched', n: 32 },
  { status: 'challenge', n: 27 },
  { status: 'moderation', n: 1 }
]
```

Czyli część zgłoszeń dostała dopasowane rozwiązania, część stała się otwartymi wyzwaniami, a pojedyncze czekają na moderację. Bez kluczy trwa to kilkanaście sekund, z kluczami dłużej.

Uwaga: `db:seed` za każdym razem **czyści całą bazę** i wgrywa dane od nowa. Jeśli zmienisz `AI_MOCK` w `.env`, uruchom go jeszcze raz.

### Krok 6. Uruchom aplikację

```sh
pnpm dev
```

Otwórz w przeglądarce **http://localhost:5173**. Zaloguj się na jedno z kont demo opisanych niżej.

Aplikację zatrzymujesz klawiszami `Ctrl+C`. Bazę i wyszukiwarkę zatrzymujesz poleceniem `docker compose down`, a jeśli chcesz też usunąć wszystkie dane, `docker compose down -v`.

### Gdy coś nie działa

- **`docker compose` zwraca błąd połączenia**: Docker nie jest uruchomiony. Włącz Docker Desktop i spróbuj ponownie.
- **`port is already allocated`**: inny program zajmuje port 5432 albo 9200. Zatrzymaj go (najczęściej lokalny Postgres).
- **Kontener `es` nie dochodzi do stanu `Healthy`**: Elasticsearch potrzebuje około 2 GB wolnej pamięci RAM. W Docker Desktop zwiększ limit pamięci w ustawieniach.
- **`pnpm db:seed` kończy się błędem połączenia**: kontenery z kroku 4 nie działają. Sprawdź `docker compose ps`.
- **Strona się otwiera, ale nie ma żadnych wyzwań ani innowacji**: nie uruchomiono `pnpm db:seed` albo zakończył się błędem.

## Konta demo

Na `/login` logujesz się jednym kliknięciem (docelowo byłby login.gov.pl).

- **Halina**: mieszkanka, zgłasza problemy i testuje rozwiązania
- **Olena**: mieszkanka, pisze po ukraińsku
- **Ola**: NGO, odpowiada na wyzwania pomysłami, pisze wnioski
- **Piotr**: gmina, plan wdrożenia innowacji u siebie
- **Dr Anna**, **Marek**: eksperci, komentują pomysły
- **Zespół ROPS**: admin

Dobry początek: na stronie głównej kliknij przykład „Dojazd do lekarza” i wyślij. Potem zaloguj się jako Ola, wejdź w któreś wyzwanie i dodaj pomysł. Na koniec zajrzyj do `/admin` jako ROPS.

Kilka rzeczy, które łatwo przeoczyć:

- nazwa miejscowości w opisie (np. Bochnia) sama ustawia gminę,
- numer telefonu w opisie pokazuje ostrzeżenie o danych osobowych, a wulgaryzm albo groźba wysyła zgłoszenie do moderacji zamiast tworzyć wyzwanie,
- opis zagrożenia życia pokazuje numery 112, 116 123 i 116 111.

## Jak działa dopasowanie

Każde zgłoszenie przechodzi przez te same kroki:

1. **Anonimizacja.** Usuwamy z tekstu dane osobowe.
2. **Klasyfikacja.** Jev określa obszar, grupę docelową, pilność i gminę. Sprawdza też, czy tekst opisuje problem społeczny i czy nie zawiera obraźliwych treści. Jeśli coś budzi wątpliwości, zgłoszenie trafia do moderacji.
3. **Wyszukiwanie.** Szukamy rozwiązań w Elasticsearch dwiema metodami: pełnotekstowo (BM25 z polską lematyzacją) i semantycznie (kNN na embeddingach). Obie listy łączymy metodą RRF.
4. **Ocena.** Jev ocenia w skali 0–4, jak dobrze każde znalezione rozwiązanie pasuje do problemu. Do wyników trafiają tylko te, które z prawdopodobieństwem co najmniej 60% dostają ocenę 3 lub 4.
5. **Uzasadnienie.** Claude dopisuje do każdego pasującego rozwiązania krótkie wyjaśnienie, dlaczego pasuje.
6. **Wyzwanie.** Jeśli żadne rozwiązanie nie przekroczyło progu, zgłoszenie dołącza do podobnego otwartego wyzwania. Gdy takiego nie ma, powstaje nowe.

Progi są w `src/lib/server/match/policy.ts`. Więcej o architekturze w [`docs/architektura.md`](docs/architektura.md), o kosztach w [`docs/koszty.md`](docs/koszty.md).

## Kod

- `src/routes`: strony i API (SvelteKit)
- `src/lib/components`: komponenty, w `ui/` shadcn-svelte
- `src/lib/server/match`: pipeline zgłoszeń i wyzwania
- `src/lib/server/search`: Elasticsearch i wyszukiwanie hybrydowe
- `src/lib/server/ai`: Jev, Claude, embeddingi, prompty
- `src/lib/server/entities`: dane osobowe, wulgaryzmy, miejscowości
- `src/lib/server/db`: schemat (Drizzle), migracje w `drizzle/`
- `messages/`: tłumaczenia, `pl.json` jest wzorcem
- `scripts/`: seed, ewaluacja, import TERYT, przebudowa indeksów

Przydatne polecenia:

```sh
pnpm check            # typy
pnpm lint
pnpm vitest run       # testy jednostkowe
pnpm test:e2e         # Playwright + axe, potrzebuje zaseedowanej bazy
pnpm eval:match       # jakość dopasowania (hit@k, MRR), tylko z prawdziwymi kluczami
pnpm check:messages   # czy wszystkie tłumaczenia mają komplet kluczy
pnpm worker           # zadania w tle jako osobny proces
```

## Produkcja

`docker compose --profile app up -d` stawia aplikację, workera, Postgresa i Elasticsearch. Trzeba ustawić `ORIGIN` na publiczny adres. Jak aplikacja i worker działają osobno, na instancjach aplikacji ustaw `RUN_WORKERS_IN_APP=0`.

## Dane

Dane demo są zmyślone, łącznie z Biblioteką Innowacji. Przy prawdziwym wdrożeniu trzeba ją podmienić na eksport z biblioteki ROPS. Kody TERYT powiatów są prawdziwe, gminy to wybrana próbka (pełną listę wczytuje `scripts/import-teryt.ts`). Granice powiatów na mapie są z PRG GUGiK, przez repozytorium ppatrzyk/polska-geojson.
