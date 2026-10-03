# Koszty utrzymania / Running costs

Estimates for October 2026 prices. Every AI call is logged in `audit_ai` (model, tokens, latency), so after a pilot month the real numbers replace these with one SQL query:

```sql
SELECT provider, model, kind, count(*), sum(input_tokens), sum(output_tokens), avg(latency_ms)
FROM audit_ai WHERE created_at > now() - interval '30 days' GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
```

## AI usage per action (estimated tokens)

| Action                                                        | Provider                           | Input                          | Output | Cost per action                                   |
| ------------------------------------------------------------- | ---------------------------------- | ------------------------------ | ------ | ------------------------------------------------- |
| Need: intake + PII + rerank (20 candidates) + challenge check | Jev ($0.042 / M tokens)            | ~9 000                         | –      | < $0.001                                          |
| Need: 2 embeddings                                            | Voyage                             | ~300                           | –      | < $0.001                                          |
| Need: match reasons                                           | Claude Haiku 4.5 ($1 / $5 per M)   | ~1 500                         | ~300   | ~$0.003                                           |
| Need → new challenge (≈ 40% of needs)                         | Claude Haiku 4.5                   | ~500                           | ~150   | ~$0.001                                           |
| Assistant session (≈ 10 turns)                                | Claude Sonnet 5.5 ($2 / $10 per M) | ~30 000 (cached system prompt) | ~3 000 | ~$0.09                                            |
| Middleman implementation plan                                 | Claude Sonnet 5.5                  | ~2 000                         | ~1 500 | ~$0.02                                            |
| Grant application pre-fill                                    | Claude Sonnet 5.5                  | ~3 000                         | ~2 000 | ~$0.03                                            |
| Easy-read rewrite of a section                                | Claude Haiku 4.5                   | ~600                           | ~500   | ~$0.003, cached for everyone after the first view |

Jev is cheap enough that the decision layer is effectively free; Claude runs only after Jev has decided prose is needed.

## Monthly

|                                                                              | Pilot: 1 000 needs / month | Region: 10 000 needs / month          |
| ---------------------------------------------------------------------------- | -------------------------- | ------------------------------------- |
| AI: needs (Jev + Voyage + Claude Haiku)                                      | ~$5                        | ~$45                                  |
| AI: 200 / 2 000 assistant sessions                                           | ~$18                       | ~$180                                 |
| AI: plans, applications, easy-read, translations                             | ~$5                        | ~$40                                  |
| **AI total**                                                                 | **~$30**                   | **~$265**                             |
| Hosting: 1 VM 4 vCPU / 8 GB (app + worker + ES) + managed Postgres + backups | ~€40–70                    | 2–3 VMs + managed Postgres: ~€150–250 |
| **Total**                                                                    | **≈ 300–450 zł**           | **≈ 1 700–2 100 zł**                  |

Load test (single Node process, mock AI, 4 vCPU shared with Postgres and Elasticsearch): 200 concurrent users, 250 req/s, 0 errors, p95 0.6 s for pages and 1.0 s for search. Public pages send `s-maxage` cache headers, so a CDN absorbs most anonymous traffic.

## People and maintenance

| Role                                                                                | Effort                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Developer / DevOps (updates, monitoring, backups, ES reindex after mapping changes) | ~0.25 FTE                                                               |
| ROPS content admin (library entries, moderation, replies, grant calls)              | part of existing hub team; AI triage and reply drafts cut handling time |
| Experts                                                                             | existing ROPS expert network, assigned by triage                        |

No licence costs: SvelteKit, Postgres, pg-boss, Elasticsearch Basic (BM25 + kNN; fusion runs in the app), dictionary-pl are open source or free tier.
