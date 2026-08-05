# Lottery Intel — Production Database Design

## Status and conventions

This document is the target production design. It intentionally does **not** modify or endorse the current `database/schema.sql` as complete. Implementation must arrive as reviewed, versioned Supabase migrations.

Conventions:

- PostgreSQL `uuid` primary keys use `gen_random_uuid()`; append-only/event tables may use `bigint generated always as identity`.
- All timestamps are `timestamptz` in UTC. `draw_date` is a Singapore calendar `date`; a separately sourced exact event time may be stored as `drawn_at timestamptz`.
- Monetary fields are integer Singapore cents (`bigint`) plus `currency char(3) = 'SGD'`, never floating point.
- Draw numbers and winning values are text to preserve punctuation and leading zeroes.
- Canonical enums/check constraints are migrations, not free-form UI strings. State transitions occur through privileged functions.
- `created_at` is immutable; mutable records have `updated_at`; public revisions also have `published_at`.

## Entity model

A stable `draws` row represents the game/draw identity. Each attempted or corrected dataset is an immutable `draw_revisions` row. Results reference a revision, not the stable draw. At most one revision is the current published revision for a draw. This prevents partial corrections and preserves history.

### Reference tables

#### `games`

| Field | Type | Rules |
|---|---|---|
| `code` | `text` PK | check in `('4d','toto','sweep')` |
| `name` | `text` | administrative canonical name |
| `active` | `boolean` | default true |

Seed all three values in a migration.

#### `game_rule_sets`

Versioned rules allow historical formats to differ without weakening integrity.

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `game_code` | FK → `games.code` | not null |
| `version` | `integer` | positive, unique with game |
| `effective_from` / `effective_to` | `date` | non-overlapping range per game; end nullable |
| `rules` | `jsonb` | validated administrative configuration; includes TOTO range/count or Sweep format |
| `created_at` | `timestamptz` | not null |

An exclusion constraint on a generated `daterange` should prevent overlapping effective ranges. A revision pins one ruleset, so later rule changes do not reinterpret history. Known rules are migrations; operators cannot casually edit them.

### Draw and revision tables

#### `draws`

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `game_code` | FK → `games.code` | not null |
| `draw_no` | `text` | not blank; source-preserved normalized identifier |
| `draw_date` | `date` | Singapore draw date, not null |
| `drawn_at` | `timestamptz` nullable | only when reliably sourced |
| `current_published_revision_id` | `uuid` nullable | deferred FK → `draw_revisions.id`; must belong to same draw and be published |
| `created_at` / `updated_at` | `timestamptz` | not null |

Keys/indexes:

- Unique `(game_code, draw_no)`.
- Index `(game_code, draw_date desc, draw_no desc, id desc)` for archives/latest.
- Do **not** require `(game_code, draw_date)` unique: special/additional same-day draws may exist until official rules prove otherwise.

#### `draw_revisions`

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `draw_id` | FK → `draws.id` | not null |
| `revision_no` | `integer` | positive, unique with draw |
| `rule_set_id` | FK → `game_rule_sets.id` | not null; matching game/date enforced at ingest/publish |
| `status` | `text` | `staged`, `validating`, `quarantined`, `eligible`, `published`, `superseded`, `rejected` |
| `normalized_checksum` | `text` | lowercase SHA-256 hex; not null |
| `parser_name` / `parser_version` | `text` | not null |
| `import_run_id` | FK → `import_runs.id` | not null |
| `supersedes_revision_id` | self FK nullable | same draw |
| `publication_note` | `text` nullable | safe operator rationale |
| `published_at` / `published_by` | timestamp/text nullable | paired; importer/operator identity |
| `created_at` | `timestamptz` | not null |

Keys/indexes:

- Unique `(draw_id, revision_no)` and `(draw_id, normalized_checksum)`.
- Partial unique `(draw_id) WHERE status = 'published'` (the current published state); the publish transaction first supersedes the old revision.
- Index `(status, created_at)`, `(import_run_id)`, and `(supersedes_revision_id)`.
- Results are immutable after a revision becomes `eligible`; corrections create a new revision.

Draw identity fields are changed only through a reviewed correction function which also audits the old/new value. A deferrable consistency trigger checks `current_published_revision_id` and revision ownership/status at commit.

### 4D results

#### `four_d_results`

| Field | Type | Rules |
|---|---|---|
| `revision_id` | FK → `draw_revisions.id` | cascade only while staged; part of PK |
| `prize_type` | `text` | `first`, `second`, `third`, `starter`, `consolation` |
| `position` | `smallint` | see cardinality rules |
| `winning_number` | `text` | exactly four ASCII digits |
| `created_at` | `timestamptz` | not null |

Primary key `(revision_id, prize_type, position)`. Unique `(revision_id, winning_number)` prevents a number occupying multiple prize positions within one draw. Index `(winning_number, revision_id)` supports profiles; index `(revision_id, prize_type, position)` is covered by the PK.

**4D cardinality rules:**

- Exactly one each of `first`, `second`, and `third`, with `position = 1` for a uniform ordered model.
- Exactly 10 `starter` positions numbered 1–10 and exactly 10 `consolation` positions numbered 1–10.
- Exactly 23 rows and 23 distinct four-digit strings per revision.
- No gaps or duplicates in positions.
- The referenced revision and ruleset must be for game `4d`.

Row checks handle valid type/position combinations and number format. A deferred constraint trigger or the transactional `publish_draw_revision()` function checks aggregate cardinality; direct status updates are revoked. Database tests must prove invalid sets cannot publish.

### TOTO results and prize display

#### `toto_numbers`

| Field | Type | Rules |
|---|---|---|
| `revision_id` | FK → `draw_revisions.id` | part of PK |
| `number_kind` | `text` | `main` or `additional` |
| `position` | `smallint` | main 1–6; additional 1 |
| `winning_number` | `smallint` | within pinned ruleset range |

Primary key `(revision_id, number_kind, position)`. Unique `(revision_id, winning_number)` ensures the additional number differs from every main number. Index `(winning_number, revision_id)` supports analysis.

**TOTO cardinality rules:**

- Exactly six main rows at positions 1–6 and one additional row at position 1.
- Exactly seven distinct values.
- Values lie within the pinned rule set's inclusive minimum/maximum. Do not hard-code `1–49` for all history unless source/rule research verifies it for every historical era.
- Stored main positions preserve the official/source order if meaningful; analysis that treats the set as unordered must sort explicitly.
- The referenced revision/ruleset must be for `toto`.

#### `toto_prize_groups`

| Field | Type | Rules |
|---|---|---|
| `revision_id` | FK → `draw_revisions.id` | part of PK |
| `group_no` | `smallint` | positive |
| `prize_amount_cents` | `bigint` nullable | non-negative |
| `winner_count` | `integer` nullable | non-negative |
| `is_snowballed` | `boolean` nullable | only when sourced |
| `currency` | `char(3)` | `SGD` |

Primary key `(revision_id, group_no)`. Public DTOs expose/focus on groups 1 and 2. These rows are supplemental: missing prize breakdown must not prevent publication of otherwise fully verified winning numbers. Never infer zero winners or amounts from missing fields.

Optional draw-level advertised prize data belongs in a separate sourced `draw_announcements` table (`draw_id`, `announcement_kind`, amount/currency, effective time, observation ID), because it often describes a future draw rather than the current result.

### Singapore Sweep model

Sweep source formats and historical rule changes must be verified before migration implementation. The normalized design avoids assuming a fixed ticket length or number of winners.

#### `sweep_prize_tiers`

| Field | Type | Rules |
|---|---|---|
| `id` | `uuid` PK | |
| `rule_set_id` | FK → `game_rule_sets.id` | Sweep only |
| `tier_code` | `text` | stable internal code |
| `source_label` | `text` | exact normalized label for evidence |
| `display_order` | `smallint` | positive |
| `prize_amount_cents` | `bigint` nullable | non-negative; only if rule/source verified |

Unique `(rule_set_id, tier_code)` and `(rule_set_id, display_order)`.

#### `sweep_results`

| Field | Type | Rules |
|---|---|---|
| `revision_id` | FK → `draw_revisions.id` | part of PK |
| `tier_id` | FK → `sweep_prize_tiers.id` | same pinned ruleset |
| `position` | `integer` | positive, source order |
| `ticket_number` | `text` | digits with leading zeroes preserved; format checked against ruleset |
| `series` | `text` nullable | separately normalized when present |
| `entry_suffix` | `text` nullable | separately normalized when source defines suffix/category |
| `source_display_value` | `text` | normalized faithful display value |

Primary key `(revision_id, tier_id, position)`. A null-safe unique constraint/index across `(revision_id, tier_id, ticket_number, coalesce(series,''), coalesce(entry_suffix,''))` prevents duplicates. Publication validates tier membership, position continuity, entry format, and per-tier counts against the pinned ruleset. Until those rules are verified, candidates are quarantined—not forced into a guessed schema.

## Import, source, and validation records

### `data_sources`

`id uuid` PK; stable `code` unique; `name`; `source_class` (`official`, `licensed`, `independent`); `base_origin` nullable/restricted; `active`; `independence_group`; `created_at`. URLs are not specified in this blueprint because they have not been verified. “Independent” acceptance requires different `independence_group` values, not merely two URLs mirroring one feed.

### `import_runs`

| Field | Type / notes |
|---|---|
| `id uuid` PK | correlation ID |
| `mode` | `backfill`, `latest`, `repair`, `revalidate` |
| `game_code` FK nullable | nullable only for an explicitly multi-game orchestrator |
| `requested_from` / `requested_to date` nullable | immutable scope |
| `status` | `queued`, `running`, `completed`, `completed_with_review`, `failed`, `cancelled` |
| `config jsonb` | adapter versions, source IDs, retry policy; secrets excluded |
| `sampling_seed text` / `sampling_algorithm_version text` nullable | mandatory for sampled backfill |
| `started_at` / `completed_at` / `heartbeat_at` | lifecycle |
| `created_by` / `deployment_id` | actor/build |
| `summary jsonb` | counts only; detailed facts live in child rows |

Indexes `(status, created_at)`, `(game_code, started_at desc)`.

### `import_work_items`

`id uuid` PK; `run_id` FK; stable `work_key`; `game_code`; expected draw/range identity; `status` (`queued`, `leased`, `fetched`, `parsed`, `validated`, `quarantined`, `published`, `failed`, `skipped`); `checkpoint_stage`; `attempt_count`; `lease_owner`; `lease_expires_at`; `next_attempt_at`; `last_error_code`/safe message; `revision_id` nullable; timestamps. Unique `(run_id, work_key)`. Index `(status, next_attempt_at)` and `(run_id, status)`.

### `source_observations`

`id uuid` PK; `work_item_id` FK; `source_id` FK; canonical request locator (restricted); `retrieved_at`; HTTP status and content type; `artifact_storage_key` nullable; `content_sha256`; byte length; adapter/parser version; `normalized_payload jsonb` or restricted reference; `normalized_sha256`; parse status/error. Unique `(source_id, content_sha256, parser_version)` where appropriate and unique `(work_item_id, source_id, normalized_sha256)`. Raw retention/licensing is unresolved; public roles receive no access.

### `validation_records`

`id bigint` PK; `revision_id` FK; `run_id` FK; `validation_type` (`schema`, `cardinality`, `range`, `chronology`, `cross_source`, `manual`); `rule_code`; `outcome` (`pass`, `fail`, `warning`); `details jsonb` containing structured safe expected/actual facts; observation IDs; validator/version; `created_at`. Index `(revision_id, outcome)` and `(run_id, outcome)`. Records are append-only.

### `validation_samples`

Defines the population and reproducible historical random sample: `id uuid` PK, `run_id`, `game_code`, range/population query version, population checksum/count, PRNG algorithm/version, seed, requested/actual sample size, selection timestamp. `validation_sample_members` has `(sample_id, draw_id)` PK plus rank and primary/secondary observation IDs and outcome. The algorithm sorts a frozen population by canonical key before seeded selection.

### `review_cases`

`id uuid` PK; `revision_id`; optional `draw_id`; `reason_code`; `status` (`open`, `investigating`, `resolved_accept`, `resolved_correct`, `resolved_reject`); severity; summary; `assigned_to`; resolution/rationale; opened/resolved timestamps and actors. Index `(status, created_at)`. Any mismatch opens or attaches to a case.

### `source_mismatches`

`id uuid` PK; `review_case_id` FK; `draw_id`/revision; field path; primary/secondary observation IDs; structured primary/secondary values; detection time; resolution (`pending`, `primary_confirmed`, `secondary_confirmed`, `both_wrong`, `source_format_change`); resolver/rationale/timestamp. Append-only facts plus controlled resolution metadata. Index `(draw_id, resolution)` and `(review_case_id)`.

### `audit_events`

Append-only `bigint` PK; event time; actor type/ID; action; entity type/ID; run/review IDs; before/after checksums and safe JSON diff; reason; correlation ID. Deny update/delete to application roles. Database triggers/functions add events for publication, supersession, review disposition, and draw-identity correction.

## Publication workflow

1. Ingest into a new staged revision and result child rows; store source observations and validation records.
2. Run all game/ruleset validations. Failed invariants move the revision to `quarantined`/`rejected` and open a review case when applicable.
3. Verify source policy. Historical samples follow the recorded sampling plan; the sampled draw itself must match both independent observations. Latest draws require the configured full-draw source confirmation policy. No open mismatch may exist for the candidate.
4. Mark the immutable revision `eligible` through a restricted validation function.
5. Call `publish_draw_revision(revision_id, actor, reason)` in one transaction. It locks the `draws` row, repeats cardinality/source/open-review checks, supersedes the old revision, marks the candidate published, updates `current_published_revision_id`, and appends audit events.
6. After commit, trigger cache invalidation. Failure to invalidate cache does not roll back canonical publication and is retried.

Only publication—not staging—makes a record visible. Cross-table constraints are validated at transaction end. No importer may update the current pointer directly.

## Row-level security and grants

- Enable and force RLS on canonical, staging, import, source, validation, review, and audit tables (table owners still require operational discipline).
- Revoke all privileges from `anon` and `authenticated` on internal tables/sequences/functions.
- Create an `api_public` schema with views/security-invoker functions that select only `draws.current_published_revision_id` and approved result fields. Grant `USAGE` plus specific `SELECT`/`EXECUTE` to `anon` and `authenticated`.
- If public views remain in `public`, set `security_invoker = true` and ensure underlying published-row policies apply; avoid owner-bypass views.
- Public policies require that a result's revision equals its draw's current published revision and the revision is `published`.
- The web server uses the publishable/anonymous role and cannot write.
- Importer roles receive only execute rights on ingest/checkpoint/publication RPCs or narrowly scoped table rights. Reviewer identity has review-resolution/correction functions, not blanket owner access.
- `SECURITY DEFINER` functions set a safe fixed `search_path`, schema-qualify objects, validate caller roles, revoke `PUBLIC EXECUTE`, and write audit events.
- Automated tests impersonate anonymous, authenticated, web, importer, and reviewer roles and test positive and negative paths.

## Migration strategy

1. Adopt Supabase CLI layout `supabase/migrations/<UTC timestamp>_<description>.sql`. Never edit a migration applied to a shared environment; add a forward migration.
2. Create extensions/enums/reference tables first, then canonical/revision/result tables, then operational tables, functions/triggers, indexes, views, grants/RLS, and seed reference data in dependency order.
3. Each pull request includes a clean `supabase db reset` test, SQL constraint/RLS tests, generated TypeScript type refresh, and a forward-upgrade test from the current production migration.
4. Use expand/migrate/contract: add nullable/dual-readable structures, backfill in bounded jobs, validate constraints, switch application reads, then remove obsolete structures in a later release.
5. Add indexes concurrently when production size/transaction rules require it; monitor locks and query plans. Never place irreversible large rewrites in the same deployment as website behavior changes.
6. Take/verify a backup before destructive production phases and document roll-forward recovery. Production rollback is generally a compensating migration, not migration-file deletion.
7. Treat the existing `database/schema.sql` as a prototype snapshot until a dedicated task translates/reconciles it. Do not modify it in Sprint 0.

## Corrections and audit history

- Never edit published result children in place and never delete a published revision.
- A correction begins with a review case and new revision referencing `supersedes_revision_id`, new observations, checksums, validations, actor, and rationale.
- Publication atomically changes the current revision and marks the old one `superseded`. Public pages immediately show only the replacement; operators retain both.
- Correcting draw identity/date uses a restricted function and collision check. If a supposed draw is actually a different identity, create/merge through an explicit audited procedure rather than rewriting foreign keys ad hoc.
- Reverting a bad correction creates/publishes another revision (which may copy a previously valid payload with a new provenance decision); do not reactivate silently.
- Audit and observation retention periods, raw artifact licensing, and whether public users see a correction notice/version timestamp remain unresolved policy questions in [DECISIONS.md](./DECISIONS.md).
# Lucky Number Finder RPC

Run `supabase/migrations/20260804000200_add_lucky_number_finder_rpc.sql` in the
Supabase SQL editor (or apply migrations normally) before publishing the Lucky
Number Finder. It creates only the `api_public.find_lucky_fourd_numbers` function;
it does not alter result tables or the import pipeline. The RPC performs matching,
aggregation, scoring, stable sorting, deduplication and the 100-row limit in one
database request against the current published 4D revisions.

Finder RPC responses are cached by Next.js for up to one hour with the
`4d-lucky-finder` cache tag. After importing and publishing a result, either allow
that TTL to expire or call `revalidateTag("4d-lucky-finder")` from the publishing
workflow for immediate invalidation (and also invalidate the existing
`4d-rankings` tag). Replacing the SQL function with a migration does not require
changes to existing imports.
