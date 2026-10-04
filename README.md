# Zaczyn

Projekt na HackYeah, wyzwanie ROPS Kraków: Małopolski Hub Innowacji Społecznych.

Mieszkaniec opisuje problem swoimi słowami (np. „nie mam jak dojechać do lekarza”), a my szukamy w Bibliotece Innowacji Społecznych rozwiązań, które gdzieś już zadziałały. Jak nic nie pasuje, zgłoszenie zamienia się w otwarte wyzwanie, na które mogą odpowiedzieć NGO, gminy albo zwykli ludzie z pomysłem. Zespół ROPS ma panel, w którym widzi zgłoszenia, pomysły i trendy.

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

Wymagania: Node 22, pnpm 10, Docker.

**1. Zależności i konfiguracja**

```sh
pnpm install
cp .env.example .env
```

Przy ustawianiu `.env` zdecyduj, czy działasz z kluczami API, czy bez:

- Jeśli nie masz kluczy ustaw `AI_MOCK=1`. Zamiast modeli działają proste reguły na słowach kluczowych. Wszystko da się przeklikać, ale dopasowania są słabe.
- Jeśli masz klucze zostaw `AI_MOCK=0` i uzupełnij:
  - `TYPESAFE_API_KEY`: Jev, czyli klasyfikacja zgłoszeń, moderacja i ocena dopasowania,
  - `ANTHROPIC_API_KEY`: Claude, czyli teksty (wyjaśnienia, asystent, wnioski, tłumaczenia),
  - `VOYAGE_API_KEY`: embeddingi do wyszukiwania.


**2. Postgres i Elasticsearch**

```sh
pnpm es:dict                     # kopiuje polski słownik hunspell do obrazu Elasticsearch
docker compose up -d --wait db es
```

Pierwsze uruchomienie buduje obraz Elasticsearch, więc trwa chwilę. `--wait` czeka, aż oba kontenery będą gotowe.

**3. Schemat bazy i dane demo**

```sh
pnpm db:migrate
pnpm db:seed
```

Seed wgrywa obszary, grupy docelowe, 22 powiaty i 42 gminy, 30 innowacji w Bibliotece, konta demo, dwa nabory grantowe i kampanie testowe. Potem przepuszcza 60 przykładowych zgłoszeń przez ten sam pipeline co prawdziwe, więc na końcu część z nich ma dopasowania, część jest otwartymi wyzwaniami, a pojedyncze czekają w moderacji. Bez kluczy trwa to kilkanaście sekund, z kluczami dłużej, bo każde zgłoszenie idzie przez API.

`db:seed` za każdym razem czyści bazę i indeksy w Elasticsearch. Uruchom go ponownie po zmianie `AI_MOCK`, żeby dane demo przeszły przez właściwe modele.

**4. Aplikacja**

```sh
pnpm dev                         # http://localhost:5173
```

Zadania w tle (powiadomienia, trendy) działają w tym samym procesie, osobny worker nie jest potrzebny.

Żeby zacząć od zera, usuń kontenery razem z danymi: `docker compose down -v`.

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

1. Z tekstu usuwamy dane osobowe.
2. Jev klasyfikuje zgłoszenie: obszar, grupa, pilność, gmina, czy to w ogóle problem i czy nie jest obraźliwe. Podejrzane zgłoszenia idą do moderacji.
3. Szukamy w Elasticsearch na dwa sposoby: BM25 z polską lematyzacją i kNN na embeddingach. Wyniki łączymy przez RRF.
4. Jev ocenia każdego kandydata w skali 0–4. Kandydat jest dopasowaniem, jeśli szansa na ocenę 3 lub 4 wynosi co najmniej 60%.
5. Claude pisze krótko, dlaczego dane rozwiązanie pasuje.
6. Jeśli nic nie przeszło progu, zgłoszenie dołącza do podobnego otwartego wyzwania albo tworzy nowe.

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
