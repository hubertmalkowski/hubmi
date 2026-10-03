# Architektura / Architecture

## Components

| Component                      | Role                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| SvelteKit 2 (adapter-node)     | UI + JSON API, server-rendered, works without JavaScript for core forms                          |
| Postgres 16                    | source of truth: users, needs, innovations, matches, ideas, calls, threads, notifications, audit |
| pg-boss (on Postgres)          | background jobs: need processing, embeddings, ES sync, triage, translations, trend refresh       |
| Elasticsearch 9                | search index (derived, rebuildable): Polish BM25 + dense vectors                                 |
| TypeSafe Jev                   | typed decisions (Choice / Score / Noul) with calibrated probabilities                            |
| Claude (Sonnet 5.5, Haiku 4.5) | prose only: explanations, drafts, assistant, plans, translations                                 |
| Voyage                         | multilingual embeddings (needs in Polish, Ukrainian, English vs a Polish library)                |

App instances are stateless (sessions in Postgres), so they scale horizontally. Workers run in-process by default or as a separate process (`pnpm worker`) scaled independently.

## Matching pipeline (`src/lib/server/match/pipeline.ts`)

1. **Redaction.** Regex finds PESEL (checksum-validated), phones, emails, postcodes, street addresses. Person names: a first-name gazetteer with Polish case endings proposes "Jan Kowalski" / "Marii Wiśniewskiej" pairs; one Jev Noul per candidate confirms. Claude and Elasticsearch only ever see the redacted text. If personal data is still likely after redaction (Noul ≥ 0.5) the need goes to admin moderation and is not indexed.
2. **Intake classification.** One Jev request: area (Choice over 8 areas), each target group (Noul, because groups are not mutually exclusive), urgency (Score 0–3), is-it-a-need (Noul), personal data (Noul), place (Choice over gazetteer hits + "none").
3. **Retrieval.** Two Elasticsearch queries in parallel: BM25 over title/summary/description with a Polish analyzer (hunspell lemmas from `dictionary-pl`, search-time synonyms), and kNN over `int8_hnsw` vectors. Light boosts for confident area and target groups.
4. **Fusion.** Reciprocal Rank Fusion (k = 60) in application code. Elasticsearch's own `rrf`/`linear` retrievers need an Enterprise licence; kNN itself is free. A min-max linear blend is available for comparison in `eval-match`.
5. **Rerank and decide.** One Jev request with a Score question per candidate (20 in parallel). P(score ≥ 3) ≥ 0.6 counts as a match; this gives an absolute threshold, which a relative cross-encoder score cannot. MMR (λ = 0.7) keeps near-duplicates out of the top 5.
6. **Challenge.** No confident match → kNN over open challenges in the same area, Jev Noul "same unmet problem?" ≥ 0.7 attaches the need, otherwise Claude Haiku writes a new challenge.
7. **Explain.** Claude Haiku writes one "why it fits" sentence per shown match in the user's language; Elasticsearch highlights show the matched words.

Fallbacks: Jev failure → Claude structured output with the same questions → if that fails too, RRF order without a match claim.

## Why these choices

| Decision                               | Reason                                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elasticsearch, not Postgres full-text  | Postgres ships no Polish stemmer; hunspell lemmatizes "seniorów" → "senior", "Nowym Targu" → "nowy targ"                                                          |
| Hunspell instead of the Stempel plugin | no plugin download needed; dictionary lemmas beat algorithmic stems on inflection; same files upload to Elastic Cloud                                             |
| RRF in app code                        | rank-based, no score normalization or tuned weights; avoids the Enterprise-only retrievers                                                                        |
| Jev as reranker                        | calibrated absolute probability → principled "match or open a challenge"                                                                                          |
| No general NER model                   | a Python sidecar and ~500 MB model for little gain; entities that matter are closed sets (182 gminas, PII patterns) handled by gazetteer/regex + Jev confirmation |
| English questions, Polish state        | Jev is primarily English; validate with `pnpm jev:smoke`. If accuracy < 80%, add an English gloss (`normalized_pl` → Claude translation) to the state             |

## Place linking (`src/lib/server/entities/places.ts`)

The text is lemmatized by the same Elasticsearch analyzer; every gmina name and alias is folded locally. A place is a candidate only if every word of its name matches a text token, either by lemma or as an inflected form (the name may lose ≤ 2 trailing letters, the text word may add ≤ 4 when the full name is kept, otherwise ≤ 2). "w Zawoi" → Zawoja, "w Tarnowie" → Tarnów, but "w naszej wsi" does not match "Wielka Wieś". Jev then chooses the place where the problem occurs, or none.

## Accessibility

WCAG 2.1 AA target, checked by axe-core in Playwright on every public and admin page in light, dark + high contrast + 150% text. Text size, contrast and theme are cookies rendered server-side (no flash). Charts use a validated palette, always ship a legend and a table view, and print numbers in every map tile. Core forms work without JavaScript.

## Security and RODO

No real personal data in seed. Redaction before any search index or Claude call. API keys server-side only. Role checks in `hooks.server.ts`; SvelteKit origin checks for form actions; zod validation on every endpoint; per-user rate limits in Postgres. `audit_ai` stores call metadata (model, tokens, latency), never payloads.

## Integration points

- JSON API under `/api/*` (library search, classification, needs, threads, notifications, trends).
- Grant calls are data (`calls.form_schema`), so a regional grant system can define forms without code changes.
- Status changes are events (`status_events`) and notifications; outbound webhooks can subscribe to the same points.
