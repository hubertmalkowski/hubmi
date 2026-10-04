# Zaczyn

Projekt na HackYeah, wyzwanie ROPS Kraków: Małopolski Hub Innowacji Społecznych.

Mieszkaniec opisuje problem swoimi słowami (np. „nie mam jak dojechać do lekarza”), a my szukamy w Bibliotece Innowacji Społecznych rozwiązań, które gdzieś już zadziałały. Jak nic nie pasuje, zgłoszenie zamienia się w otwarte wyzwanie, na które mogą odpowiedzieć NGO, gminy albo zwykli ludzie z pomysłem. Zespół ROPS ma do tego panel, w którym widzi zgłoszenia, pomysły i trendy.

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

## Uruchomienie

Potrzebne: Node 22, pnpm 10, Docker.

```sh
pnpm install
cp .env.example .env
pnpm es:dict                 # polski słownik hunspell dla Elasticsearch
docker compose up -d db es
pnpm db:migrate
pnpm db:seed
pnpm dev                     # http://localhost:5173
```

Uwaga: `db:seed` czyści bazę i indeksy w Elasticsearch.

Bez kluczy API ustaw `AI_MOCK=1` w `.env`. Wtedy zamiast modeli działają proste reguły na słowach kluczowych. Wszystko da się przeklikać, ale wyniki dopasowania są słabe. Do pokazywania lepiej mieć klucze:

- `TYPESAFE_API_KEY`: Jev, czyli klasyfikacja zgłoszeń, moderacja i ocena dopasowania,
- `ANTHROPIC_API_KEY`: Claude, czyli teksty (wyjaśnienia, asystent, wnioski, tłumaczenia),
- `VOYAGE_API_KEY`: embeddingi do wyszukiwania.

Po zmianie `AI_MOCK` warto puścić `pnpm db:seed` jeszcze raz, bo dane demo przechodzą przez ten sam pipeline co prawdziwe zgłoszenia.

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
4. Jev ocenia każdego kandydata w skali 0–4. Wszystko z dość wysokim prawdopodobieństwem oceny 3 lub więcej uznajemy za dopasowanie.
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
