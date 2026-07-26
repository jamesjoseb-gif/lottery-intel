# Lottery Intel — Sprint 0 Project Blueprint

## Purpose

Lottery Intel is a public, website-only reference for official Singapore lottery results and transparent historical statistics. It helps English- and Chinese-language readers find complete draw records, inspect the history of a 4D number, and understand past frequencies and gaps. Statistics describe recorded outcomes only; they must never be labelled or presented as predictions, recommendations, or guarantees of future results.

## V1 scope

V1 covers the complete historical data that can be acquired and validated for:

- **Singapore 4D:** every draw's 1st, 2nd, 3rd, 10 Starter, and 10 Consolation results.
- **TOTO:** the six main winning numbers and additional number required for analysis, with public result summaries focused on Group 1 and Group 2 prize information when reliable source data is available.
- **Singapore Sweep:** draw metadata and all reliably modelled published prize-winning entries; the exact historical tier/card-number formats remain a source-discovery question.
- English (`en-SG`) and Simplified Chinese (`zh-SG`) website content, routes, labels, metadata, empty states, validation errors, and responsible-use copy.
- Browsable latest and historical results, game/date/draw navigation, and permanent profiles for 4D values `0000`–`9999`.
- Descriptive analysis derived only from published records: appearance counts, prize-category breakdowns, elapsed-draw gaps, timelines, and time/digit distributions.
- A validated historical backfill and an operationally runnable latest-draw import path designed for later scheduling.
- Public access without registration or payment.

“Complete historical data” means all records made available by viable sources, not an arbitrary 20-year window. Coverage boundaries and known gaps must be displayed rather than silently inferred.

## Out of scope

- AI prediction, number selection, “lucky” recommendations, or claims that history predicts future outcomes.
- Premium subscriptions, paywalls, user accounts, portfolios, alerts, or personalization.
- Compare Numbers.
- Native or packaged mobile applications; responsive web support remains required.
- Building the importer in Sprint 0. This blueprint defines its contract and controls only.
- Unverified live results. A “Live Draw Centre” may show publication state, but only validated, published records are official on Lottery Intel.
- Changes to the existing application behavior or `database/schema.sql` during Sprint 0.

## Primary user journeys

1. **Find a 4D number:** enter exactly four digits (including leading zeroes), open its canonical profile, view appearances across all five prize categories, counts and gaps, and see a non-prediction explanation.
2. **Read a latest result:** select 4D, TOTO, or Sweep; see the latest published draw, draw identity/date, full result as applicable, validation/publication freshness, and move to adjacent or archived draws.
3. **Browse 4D history:** select a draw/date and see exactly 23 ordered result rows: three top prizes, 10 Starter, and 10 Consolation.
4. **Browse TOTO history:** see six main numbers and the additional number; see Group 1 and Group 2 public prize information when present, with unavailable values explicitly marked.
5. **Browse Sweep history:** select a monthly draw and see its published prize entries grouped and ordered by source-defined tier.
6. **Change language:** switch English/Chinese while staying on the equivalent page; number data and draw identities do not change.
7. **Understand limitations:** find coverage dates, source/verification state, corrections, terminology, and responsible-use language close to statistics.
8. **Operator imports data:** start or resume a game/range import, review validation evidence and mismatches, then publish an accepted batch atomically.

## Functional requirements

### Public website

- **FR-01:** Canonical game identifiers are `4d`, `toto`, and `sweep`; each has latest-result and archive pages.
- **FR-02:** Only `published` draw revisions are readable through the public data path. Pending, quarantined, rejected, and superseded data is not public.
- **FR-03:** A 4D draw cannot publish unless it contains exactly 23 entries with the cardinality defined in [DATABASE.md](./DATABASE.md).
- **FR-04:** A TOTO draw cannot publish unless it contains exactly six distinct main numbers and one distinct additional number within the configured range for that draw's ruleset.
- **FR-05:** Sweep entries preserve source labels and ordering while mapping them to stable normalized tiers and entry components; unsupported formats are quarantined.
- **FR-06:** 4D search accepts only `0000`–`9999`, preserves leading zeroes, and includes every published appearance in all five prize categories.
- **FR-07:** Result and analysis pages state their historical coverage and distinguish “no occurrence” from missing/unverified coverage.
- **FR-08:** TOTO public presentation emphasizes Group 1 and Group 2 while retaining complete winning-number data for analysis. Prize amounts/winner counts are optional when the source does not reliably provide them.
- **FR-09:** All user-facing product copy and metadata has English and Chinese translations; fallback is English and missing translation keys fail CI.
- **FR-10:** Locale-aware canonical URLs and `hreflang` metadata are used; draw IDs and number-profile semantics remain locale-independent.
- **FR-11:** Every statistics surface includes or links to a clear statement that historical results do not predict future results.
- **FR-12:** Corrections replace the public revision atomically and retain an operator-auditable history without exposing partially corrected results.
- **FR-13:** Import tooling supports historical range backfills and a single/latest-draw mode through the same adapters and validations.

### Operations and data quality

- **FR-14:** Imports are modular by game and source, idempotent for repeated identical inputs, and resumable from persisted checkpoints.
- **FR-15:** Raw retrieval metadata, content checksum, parser version, normalized payload checksum, and validation outcomes are retained.
- **FR-16:** Historical batches may be accepted after a reproducible random sample is checked against two independent sources. Any mismatch quarantines the affected draw and records both observed values for manual review.
- **FR-17:** Latest-draw publication requires the stricter source policy in [IMPORT_PIPELINE.md](./IMPORT_PIPELINE.md); historical sample acceptance must never be reused to auto-approve a mismatching draw.
- **FR-18:** Publication is an explicit transaction after structural and source validation, not a side effect of parsing.
- **FR-19:** Operators can see run state, retry counts, checkpoints, coverage, validation samples, mismatch records, and publication outcome.

## Non-functional requirements

- **NFR-01 — Accuracy:** database constraints enforce game invariants; publication validation is transactional. No public query can return unpublished child rows.
- **NFR-02 — Idempotency:** replaying identical source content produces no duplicate draw, result, evidence, or publication; checksums allow no-op completion.
- **NFR-03 — Recoverability:** a run resumes after its last committed work item; retries never require deleting accepted data.
- **NFR-04 — Security:** service-role/database-owner credentials exist only in a trusted importer environment. Browser and public Next.js paths use a publishable key and RLS-limited reads.
- **NFR-05 — Performance targets:** cached latest/archive pages should meet p75 LCP ≤2.5 s on representative mobile connections; indexed result lookups should be measured at p95 ≤300 ms at the database boundary under the expected V1 dataset. These are acceptance targets, not current measurements.
- **NFR-06 — Availability:** public pages degrade to a dated cached result and a freshness warning when Supabase is unavailable; they must not substitute mock values as official data.
- **NFR-07 — Accessibility:** target WCAG 2.2 AA, including keyboard navigation, semantic result tables/lists, language metadata, focus visibility, and non-color status indicators.
- **NFR-08 — Privacy:** V1 stores no user account or betting history. Operational logs exclude credentials and minimize request identifiers/IP data.
- **NFR-09 — Observability:** structured logs correlate import run, work item, draw, source, validation, and deployment; alerts cover stale updates, failed runs, and public read errors.
- **NFR-10 — Maintainability:** versioned migrations, typed data contracts, adapter contract tests, and localized domain code are required. Production schema changes never depend on editing a database manually.
- **NFR-11 — SEO:** index only stable published pages; use localized metadata, canonical URLs, structured result data where accurate, and no prediction-oriented claims.

## Definition of MVP completion

MVP is complete only when all of the following are demonstrated in a production-like environment:

1. Versioned Supabase migrations implement [DATABASE.md](./DATABASE.md), including RLS, constraints, publication functions, and audit history; the current `database/schema.sql` is not treated as the final production schema.
2. Verified source adapters exist for all three games, and approved backfills cover the full available history. Coverage reports identify earliest/latest accepted draw and every unresolved gap.
3. 100% of published 4D and TOTO draws pass their cardinality/integrity rules. Sweep records pass the versioned ruleset applicable to their source format.
4. The historical acceptance sample is reproducible, independently cross-checked, and has no unresolved mismatches among published draws; all other mismatches are held from publication.
5. Replaying and interrupting/resuming each importer is proven by automated tests without duplicates or partial publication.
6. English and Chinese latest, archive, detail, error/empty, and 4D profile journeys work at mobile and desktop sizes and meet the accessibility checks.
7. Public users can read only published revisions; automated authorization tests prove anonymous users cannot write or read staging, audit, validation, run, or mismatch data.
8. Latest-draw operation can be invoked manually in the same shape later used by a scheduler, with freshness/failure alerting; automatic scheduling itself may follow MVP if explicitly planned.
9. Statistics are computed only from published data and include coverage/non-prediction wording. No AI prediction, premium, Compare Numbers, account, or app feature appears.
10. Backup/restore, correction/rollback, monitoring, deployment, and operator runbooks have been exercised and signed off by product and engineering.
