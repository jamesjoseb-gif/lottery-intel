# Lottery Intel — Sprint 0 Architecture

## Architecture goals

The system separates untrusted collection and validation from public delivery. Supabase/PostgreSQL is the system of record. Next.js is the localized website and server-rendering/cache layer. A privileged, separately executed importer is the only component that retrieves external result sources or writes result data.

## Components

| Component | Responsibility | Trust level |
|---|---|---|
| Next.js App Router website | Localized routes, server-rendered pages, 4D search validation, presentation, SEO, cache/revalidation, friendly failures | Public application |
| Supabase Postgres | Canonical data, staging/evidence, constraints, transactions, RLS, audit history, read views/RPCs | System of record |
| Public Supabase client | Anonymous read of explicitly published projections only | Untrusted/public |
| Importer CLI/job | Source adapters, fetch, parse, normalize, checksum, validate, checkpoint, publish request | Privileged backend |
| Scheduler (later) | Invoke latest-draw jobs after expected publication windows; retry and alert | Privileged orchestration |
| Operator review surface/tool | Inspect mismatches/evidence, record disposition, approve corrected data | Privileged operations |
| Monitoring/error service | Structured application/import telemetry and alerts, with secret/PII filtering | Restricted operations |

The importer is deliberately not a Next.js route handler, browser task, or Server Action. Long-running work must not inherit request timeouts, and service credentials must remain outside the website runtime.

## End-to-end data flow

```text
External primary/secondary sources
        │ HTTPS fetch (importer only)
        ▼
Raw artifact metadata/checksum ──► import run + work-item checkpoint
        │
        ▼
Adapter parse ─► normalized candidate revision ─► structural validation
        │                                      ├─ mismatch/quarantine ─► manual review
        │                                      └─ source-validation evidence
        ▼
Privileged transactional publish function
        │ validate invariants + lock draw identity + switch current revision
        ▼
Published views/RPCs protected by RLS
        │
        ▼
Next.js server render/cache ─► localized public HTML/JSON UI
```

1. The importer creates a run with immutable configuration (game/range, adapter/parser versions, and sampling seed/policy).
2. Each source response is represented by metadata and a digest; raw content is retained only in approved private object storage or a restricted payload column according to licensing/retention review.
3. An adapter parses a response into a versioned, source-independent candidate.
4. Database constraints and application validators check identity, ranges, cardinalities, chronology, and duplicates. Cross-source validation creates durable evidence.
5. Any discrepancy creates a review record and keeps the draw revision quarantined. Matching/approved candidates become eligible, but not automatically public.
6. A single database transaction rechecks invariants, marks the accepted revision current/published, supersedes the previous current revision when correcting, and appends an audit event.
7. Next.js queries only public views/RPCs. Publication triggers path/tag cache revalidation; time-based revalidation is the fallback.

## Responsibility split

### Next.js owns

- App Router pages and locale routing for `en-SG` and `zh-SG`.
- Translation loading, metadata, canonical/hreflang links, accessible result presentation, and input validation.
- Server-side public Supabase calls via the publishable key; browser calls only when interaction requires them.
- Cache tags by game/draw/number, stale-data and unavailable states, and non-prediction/coverage copy.
- Aggregating presentation DTOs, never deciding whether a draw is valid or published.

Next.js must not hold a service-role key, bypass RLS, scrape source sites, mutate canonical result rows, or calculate authoritative import acceptance.

### Supabase owns

- Canonical identities, versioned results, source observations, import state, review state, and audit events.
- Referential, uniqueness, range, and publication invariants.
- Transactional privileged functions for candidate ingestion/publication/correction with explicit grants.
- RLS and stable public views/RPCs that expose only current published data and approved fields.
- Indexed queries for latest/archive/result/4D-history access; materialized aggregates only after measurement demonstrates need.

The database stores locale-neutral facts. Website translation files own UI wording; source labels may be retained as evidence and mapped to localized display labels.

## Public read architecture

Prefer React Server Components calling a server-only repository module with the public/publishable Supabase key. This preserves RLS as a defense even inside the web server. Stable DTOs should be returned by versioned public views/functions rather than exposing internal staging tables.

- Latest page: query current published draw per game plus game-specific public results.
- Archive: keyset pagination on `(draw_date DESC, draw_no DESC, id DESC)`; do not use unbounded reads.
- Detail: lookup by `(game, draw_no)` and return exactly one current published revision.
- 4D profile: indexed lookup on `winning_number`, joined only to current published 4D revisions; compute straightforward counts/gaps in SQL RPC or a reviewed view.
- Cache: tag `game:<game>`, `draw:<game>:<draw-no>`, and `4d-number:<number>`; publication requests on-demand revalidation through an authenticated internal hook or job. A short time-based TTL protects against missed hooks.
- Failure: retain last generated content when possible and show its `published_at`/freshness. Never label placeholders or cached candidates as current official results.

Direct anonymous table access is denied by default. Grant `SELECT` only on an `api_public` schema of views/RPCs (or equivalently locked public projections), and add authorization regression tests.

## Privileged importer architecture

Implement the future importer as a TypeScript workspace package/CLI deployable independently from Next.js. It uses a restricted importer database role or narrowly granted RPCs; use the Supabase service role only where infrastructure requires it. Credentials come from the job platform's secret store and are never prefixed `NEXT_PUBLIC_`.

The orchestration layer depends on adapters through the interface in [IMPORT_PIPELINE.md](./IMPORT_PIPELINE.md). Workers lease persisted work items with `FOR UPDATE SKIP LOCKED` or an atomic lease RPC. Short transactions checkpoint one draw at a time; external network calls never occur inside database transactions. Publication takes an advisory/row lock on the canonical draw identity.

A later scheduler invokes the exact same `latest --game <game>` command/API used manually. Schedule configuration, expected draw windows, source delay, retry backoff, and stale thresholds are operational configuration, not embedded in parsers.

## Security boundaries

1. **Internet → importer:** source data is untrusted. Enforce allowlisted hosts after source selection, HTTPS, response size/type/time limits, redirect limits, and parser fixtures. Never execute source markup/scripts.
2. **Browser → Next.js/Supabase:** all input is untrusted. Validate four-digit values and draw selectors, parameterize queries, apply CSP/security headers, and rate-limit abusive search/API traffic at the edge if observed.
3. **Public data boundary:** anonymous/authenticated website roles receive read-only access solely to current published projections. RLS is enabled and forced where appropriate on underlying tables; no permissive write policies exist.
4. **Privileged boundary:** importer/reviewer roles are separate from `anon` and web runtime roles. Limit them to required schemas/functions, rotate secrets, and record actor/run IDs on mutations.
5. **Operational boundary:** private artifacts, validation evidence, mismatch details, logs, and audit history are not public. Monitoring tokens and database credentials stay in secret management and are redacted from logs.
6. **Publication boundary:** only a `SECURITY DEFINER` function with a fixed `search_path`, revoked public execute rights, explicit role grants, invariant checks, and an audit write may switch a current published revision.

## Error handling

| Failure | Required behavior |
|---|---|
| Source timeout/5xx/rate limit | Classify transient, exponential backoff with jitter and cap, preserve checkpoint, alert after threshold |
| Source 404 before expected publication | Treat as not-yet-available until grace window; do not create an empty draw |
| Parse/schema drift | Store safe artifact reference/checksum, mark work item `failed` or `quarantined`, no publication, high-priority alert |
| Structural/cardinality violation | Reject candidate revision with field-level validations; never “repair” silently |
| Cross-source mismatch | Create mismatch + evidence, quarantine affected draw, require manual disposition |
| Duplicate/replay | Resolve by identity and checksums to the existing observation/revision; complete as idempotent no-op |
| Database/transient job failure | Roll back current transaction and resume from committed checkpoint |
| Public Supabase failure | Serve cached page where available; otherwise explicit temporary-unavailable state with no fabricated results |
| Cache revalidation failure | Publication remains canonical; retry hook and rely on TTL; alert on stale-age SLO |

Errors use stable machine codes plus safe operator context. User messages are localized and never reveal SQL, credentials, internal URLs, or raw source content.

## Logging, monitoring, and deployment

- Emit JSON logs containing `environment`, `deployment_id`, `run_id`, `work_item_id`, `game`, canonical draw ID, adapter/version, source ID, attempt, stage, duration, outcome, and error code. Do not log credentials or unrestricted response bodies.
- Collect Next.js request/error/latency and Core Web Vitals; Supabase query latency/error/connection metrics; importer run duration, draw throughput, retries, quarantines, mismatches, and latest-published age.
- Alert on failed latest runs, parser drift, any new mismatch, publication failure, unexpected result cardinality, repeated cache-hook failure, approaching database/storage limits, and per-game freshness beyond configured draw-specific thresholds.
- Deploy migrations forward before compatible application/importer code. Preview environments use isolated Supabase projects or schemas and synthetic fixtures—not copied secrets.
- CI gates: formatting/lint/typecheck, unit/contract/integration tests, migration lint/reset, generated-type drift, RLS tests, build, translation completeness, link/Markdown consistency, and dependency/security scanning.
- Production promotion is staged: migration → importer compatibility check → Next.js deployment → smoke tests. Destructive migrations use expand/migrate/contract releases and a backup/restore checkpoint.
- Roll back web/importer artifacts independently. Correct data through a new revision; never restore by editing published rows in place.

## Recommended folder structure

```text
app/
  [locale]/
    (public)/
      page.tsx
      4d/[drawNo]/page.tsx
      toto/[drawNo]/page.tsx
      singapore-sweep/[drawNo]/page.tsx
      number/[number]/page.tsx
components/
  results/                 # locale-aware, presentation-only components
docs/                      # product, architecture, data, import and decisions
lib/
  data/public/             # typed public repositories/DTO mapping
  domain/                  # pure game/statistics rules shared where appropriate
  i18n/                    # locale config and translation loader
  supabase/                # public browser/server client factories
messages/
  en-SG.json
  zh-SG.json
packages/
  importer/
    src/adapters/{4d,toto,sweep}/
    src/orchestration/
    src/validation/
    src/commands/
    test/fixtures/
supabase/
  migrations/              # timestamped, immutable production migrations
  seed.sql                  # synthetic local/test data only
  tests/                    # SQL constraints, functions and RLS
  config.toml
tests/
  e2e/
  integration/
```

This is the target structure, not a request to move current files during Sprint 0. `database/schema.sql` remains untouched until a separately reviewed migration task.
