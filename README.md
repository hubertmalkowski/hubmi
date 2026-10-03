# Zaczyn: Małopolski Hub Innowacji Społecznych

Prototype for the ROPS Kraków HackYeah challenge. A resident describes a social problem in their own words; Zaczyn finds proven innovations from the regional library, or turns the need into an open challenge for innovators. All seven challenge modules are implemented.

| Module                                                                           | Where                                                      |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| I. Social matchmaking (mandatory)                                                | `/report`, `/report/[id]`                                  |
| II. Knowledge base (challenge map, library, materials, admin trends)             | `/knowledge`, `/knowledge/library`, `/admin/trends`        |
| III. Idea creator (fiszka, assistant, grant application generator)               | `/ideas/new`, `/ideas/[id]/assistant`, `/calls/[id]/apply` |
| IV. Innovation tester                                                            | `/tests`                                                   |
| V. Communication (threads, live notifications)                                   | `/messages`, idea pages                                    |
| VI. Admin panel (inbox with AI triage and reply drafts, moderation, CRUD, calls) | `/admin`                                                   |
| VII. Innovation Middleman (implementation plan for an institution)               | `/adapt/[slug]`                                            |

UI in Polish, English and Ukrainian (`/en/…`, `/uk/…`). Accessibility toolbar: text size, high contrast, dark mode, easy-read rewrite, read aloud.

## How matching works

```
need text ──► PII redaction (regex + name gazetteer, confirmed by Jev)
          ──► Jev intake: area (Choice), target groups (Noul each), urgency (Score), place (Choice over gazetteer hits)
          ──► Elasticsearch: Polish BM25 (hunspell lemmas) ‖ kNN on Voyage embeddings
          ──► Reciprocal Rank Fusion (k=60, in app code)
          ──► Jev rerank: one Score (0–4) per candidate, P(score ≥ 3) ≥ 0.6 = match
          ──► MMR diversity ─► Claude Haiku "why it fits" ─► results
          └─► no confident match ─► attach to / create an open challenge
```

Details and the reasoning behind each choice: [`docs/architektura.md`](docs/architektura.md). Costs: [`docs/koszty.md`](docs/koszty.md).

## Run locally

Requirements: Node 22, pnpm 10, Docker.

```sh
pnpm install
cp .env.example .env            # add API keys, or keep AI_MOCK=1 to run fully offline
pnpm es:dict                    # copies the Polish hunspell dictionary into the ES image context
docker compose up -d db es      # Postgres 16 + Elasticsearch 9 with Polish analysis
pnpm db:migrate
pnpm db:seed                    # synthetic demo data, runs every need through the real pipeline
pnpm dev                        # http://localhost:5173 (job workers run in-process)
```

Demo accounts are on `/login` (resident, NGO, municipality, experts, ROPS admin).

### AI providers

| Variable            | Used for                                                                                                                                  | Without it                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `TYPESAFE_API_KEY`  | Jev decisions: classification, rerank, PII confirmation, triage, completeness                                                             | deterministic lexical mock  |
| `ANTHROPIC_API_KEY` | Claude: match reasons, challenge text, assistant, grant pre-fill, Middleman, easy-read, translations; also decision fallback if Jev fails | template mock text          |
| `VOYAGE_API_KEY`    | multilingual embeddings                                                                                                                   | hashed bag-of-words vectors |

`AI_MOCK=1` forces all mocks. The mocks exist for tests and offline demos; they are not models, and match quality must be judged with real keys (`pnpm eval:match`).

## Scripts

| Command                                     | What it does                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                | Paraglide compile + svelte-check (types)                                                                                   |
| `pnpm check:messages`                       | every locale has every Polish key with the same parameters                                                                 |
| `pnpm vitest run`                           | unit tests (fusion, policy, PII, place matching, fallback mapping, markdown)                                               |
| `pnpm test:e2e`                             | Playwright flows + axe-core WCAG 2.1 AA checks (needs seeded DB/ES; set `PW_CHROMIUM_PATH` to use a preinstalled Chromium) |
| `pnpm eval:match`                           | hit@1 / hit@3 / MRR for BM25, kNN, RRF, linear fusion, RRF + rerank; challenge precision/recall                            |
| `pnpm jev:smoke`                            | Jev area accuracy on 20 Polish needs (pass mark 80%)                                                                       |
| `pnpm worker`                               | job worker as a separate process (set `RUN_WORKERS_IN_APP=0` on app instances)                                             |
| `pnpm tsx scripts/es-reindex.ts all`        | zero-downtime rebuild of Elasticsearch indices from Postgres                                                               |
| `pnpm tsx scripts/import-teryt.ts TERC.csv` | import all 182 Małopolska gminas from the official GUS TERYT file                                                          |
| `k6 run scripts/load/intake.js`             | load test (run the app with `AI_MOCK=1`)                                                                                   |

## Production

`docker compose --profile app up -d` runs app, worker, Postgres and Elasticsearch from one image (`Dockerfile`). Set `ORIGIN` to the public URL. For Elastic Cloud, upload the hunspell dictionary as a custom bundle (`docker/elasticsearch/hunspell/pl_PL`).

## Data

All seed data is synthetic and contains no real personal data. Powiat TERYT codes are official; the gmina list is a demo subset with placeholder codes. Replace it with `scripts/import-teryt.ts`. The innovation library is fictional and should be replaced with the ROPS Biblioteka export (adapter in `scripts/seed.ts`).
