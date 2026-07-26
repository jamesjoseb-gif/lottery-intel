# Lottery Intel — Import Pipeline Specification

## Scope

This is an implementation contract, not an importer implementation. It covers complete-history backfill and a manually invokable latest-draw path that can later run automatically. External source URLs are intentionally absent until source ownership, independence, format, access terms, and historical coverage are verified.

## Pipeline stages

```text
PLAN → DISCOVER → FETCH → STORE EVIDENCE → PARSE → NORMALIZE
     → VALIDATE STRUCTURE → VALIDATE SOURCES → ELIGIBLE
     → TRANSACTIONAL PUBLISH → INVALIDATE CACHE → REPORT
```

Every stage is persisted against an import run/work item. Network retrieval and parsing do not publish. A draw with a mismatch or failed invariant enters quarantine/manual review.

## Historical backfill workflow

1. **Register sources:** approve source identities and `independence_group`; document authority, terms, game coverage, date coverage, timezone, formats, and known gaps. Do not confuse mirrored feeds with independent sources.
2. **Freeze a manifest:** record game, requested range (“all available”), discovered draw identifiers/pages, adapter/parser versions, source IDs, retry configuration, and deterministic sampling policy. Snapshot a sorted population checksum.
3. **Create work items:** use one canonical draw per item where discoverable, otherwise bounded discovery pages that fan out to draw items. Stable `work_key` values make re-planning idempotent.
4. **Fetch primary:** apply timeouts/rate limits; store response metadata, checksum, and approved private artifact/reference. A repeated checksum is reused.
5. **Parse and normalize:** adapter emits the contract below. Resolve `(game, draw_no)` to a stable draw and create/reuse a revision by normalized checksum.
6. **Validate locally:** require game/ruleset identity, dates, exact result cardinality, ranges, uniqueness, ordering, and checksum stability. Never fill an absent winning value from assumptions.
7. **Cross-validate:** create a reproducible random sample across the full frozen draw population, stratified at minimum by game and historical era/ruleset so early history cannot be omitted. Fetch matching records from a secondary source in a different independence group and compare normalized field by field. Record all selected members, evidence, and results.
8. **Handle results:** any sampled mismatch quarantines the affected draw and creates a review case. It also pauses acceptance of the affected source/ruleset/date stratum until an operator assesses whether the mismatch indicates systemic drift; expand validation when indicated. A clean sample permits acceptance of unsampled historical draws that pass all primary/structural checks under the approved sampling plan.
9. **Publish:** publish eligible revisions in bounded transactions (one draw is the atomic unit). A batch may be stopped without undoing already committed draws.
10. **Reconcile coverage:** compare manifest, canonical draws, and published draws. Report missing, quarantined, rejected, duplicate, corrected, earliest/latest, and per-ruleset counts. “Complete” cannot be asserted while unexplained manifest gaps remain.

The exact sample size/confidence threshold is an unresolved product/data-governance decision. The implementation must accept it as recorded configuration, not hard-code an arbitrary number.

## Latest-draw update workflow

The latest command uses the same adapters, normalized schema, database constraints, and publication function as backfill.

1. Scheduler (later) or operator invokes a game-specific job after a configured expected publication window.
2. Discover the expected draw identity; a not-yet-published response is retryable until the draw-specific grace deadline.
3. Fetch/parse primary and fetch the corresponding secondary observation. Unlike sampled history, latest updates should validate every candidate against the approved confirmation policy before publication.
4. Exact normalized agreement plus structural validation makes the revision eligible. Any disagreement, missing required evidence after the grace window, or format drift quarantines it and alerts an operator.
5. Publish one revision transactionally and invalidate relevant game, draw, latest, and affected 4D-number cache tags.
6. A subsequent identical run is a no-op. Changed source content creates a candidate correction and review case; it must not overwrite the published revision automatically.
7. Monitor “latest published age” against game-specific expected calendars. The scheduler must accommodate holidays, special draws, and source delays through configuration.

Whether two-source agreement is always attainable for rapid updates, official source authority can override after manual review, and exact schedules/grace periods are unresolved until sources are verified.

## Source adapter interface

Illustrative TypeScript contract (the eventual shared domain types must be versioned):

```ts
type GameCode = "4d" | "toto" | "sweep";

type DiscoverRequest = {
  game: GameCode;
  from?: string; // Singapore calendar date, YYYY-MM-DD
  to?: string;
  cursor?: string;
};

type SourceRef = {
  sourceId: string;
  independenceGroup: string;
  locator: string; // restricted; never returned by the public API
};

type FetchResult = {
  source: SourceRef;
  retrievedAt: string;
  mediaType: string;
  bytes: Uint8Array;
  contentSha256: string;
  sourcePublishedAt?: string;
};

type NormalizedDraw = {
  schemaVersion: 1;
  game: GameCode;
  drawNo: string;
  drawDate: string;
  drawnAt?: string;
  source: SourceRef;
  rulesetHint?: string;
  result: FourDResult | TotoResult | SweepResult;
  supplemental?: Record<string, unknown>;
};

interface SourceAdapter {
  readonly adapterName: string;
  readonly adapterVersion: string;
  readonly sourceId: string;
  readonly supportedGames: readonly GameCode[];
  discover(request: DiscoverRequest): AsyncIterable<{ locator: string; expectedDrawNo?: string }>;
  fetch(locator: string, signal: AbortSignal): Promise<FetchResult>;
  parse(input: FetchResult): Promise<NormalizedDraw[]>;
}
```

Adapters perform source-specific discovery/fetch/parsing only. They do not write canonical tables, choose publication status, silently correct fields, or calculate user statistics. Orchestration validates adapter output against a versioned schema, selects the authoritative ruleset by game/date, and writes through repository/RPC boundaries.

Contract requirements:

- Deterministic: identical bytes + adapter version produce byte-equivalent canonical JSON/checksum.
- Explicit timezone/date handling (`Asia/Singapore` for local dates); no host-local parsing.
- Preserve raw source labels/values in evidence while emitting normalized values.
- Abortable, bounded, and fixture-testable without network.
- Pagination/discovery cursors are opaque and resumable.
- Reject ambiguous layouts; do not use positional guessing after a selector/schema change.

## Primary and secondary source policy

- A **primary** source supplies the candidate corpus. A **secondary** source independently corroborates selected history or every latest draw.
- Independence is a documented provenance property. Different domains or URLs do not count if one republishes the other.
- Prefer authoritative/official publication where viable, but source selection must also assess archive completeness, stability, access permission, and machine-readability.
- Record retrieved time, reported publish time if present, locator, HTTP metadata, content and normalized checksums, adapter version, and artifact reference.
- If sources disagree, neither is silently preferred. Record field-level observations and quarantine; manual resolution may establish the authoritative value with rationale and additional evidence.
- If secondary history is unavailable for an era, that gap is unresolved and cannot be represented as a passed comparison.

## Parsing and normalization

1. Validate response status, origin, size, content type, and encoding before parsing.
2. Extract draw number/date and game-specific fields; reject missing identity or multiple ambiguous draws.
3. Normalize Unicode, surrounding whitespace, separators, and label aliases through explicit versioned maps. Preserve number strings with leading zeroes.
4. Parse Singapore local dates explicitly, then retain `draw_date`; store exact instants only when sourced with defensible timezone semantics.
5. Map 4D labels to fixed prize types/positions; TOTO to main/additional positions; Sweep to the pinned source-format/ruleset tier model.
6. Canonicalize JSON with fixed key ordering and array ordering, excluding retrieval timestamps and locators from the result checksum.
7. Validate schema and ruleset. Unknown label, count, number format, or historical format is a hard quarantine—not a warning that still publishes.
8. Store supplemental prize/announcement fields only when their semantic target draw and units are unambiguous. Missing optional TOTO group amounts remain null, never zero.

## Cross-validation algorithm

- Build the population from successfully primary-parsed, structurally valid candidate draw identities in the frozen manifest.
- Sort by `(game, ruleset/effective era, draw_date, draw_no)` and record the population count/checksum.
- Derive deterministic random ranks using a documented cryptographic PRNG/hash algorithm, version, and stored seed. Use stratification by game and ruleset/era; sample without replacement.
- Store requested and actual sample counts and every membership selection before fetching the secondary source.
- Compare canonical identities and every required game-result field. Supplemental fields are compared and classified separately so optional prize metadata does not invalidate verified winning numbers without an explicit rule.
- A missing secondary record is not a pass. It becomes `inconclusive`/review and may require a replacement sample only under a predeclared policy; never redraw samples simply to remove failures.
- Any value mismatch creates a `source_mismatches` record and review case, quarantines that draw, and triggers a stratum-level assessment/expanded sample. Publication resumes only under an auditable operator disposition.

## Checksums and duplicate prevention

- Compute `content_sha256` over exact response bytes and `normalized_sha256` over canonical result JSON plus schema/ruleset version.
- Use SHA-256 lowercase hex with algorithm name stored or fixed by schema. Checksum metadata is not a digital signature or proof of truth.
- Stable identities: source observation `(source, content checksum, parser version)`, draw `(game, normalized draw_no)`, revision `(draw, normalized checksum)`, and work item `(run, work_key)`.
- Database unique keys arbitrate concurrency; do not rely on pre-insert “exists” checks.
- On conflict, re-read and verify semantic equality. Same identity with changed content becomes a candidate revision/review case, never an overwrite.
- Result-child uniqueness and publication cardinality constraints prevent intra-draw duplicates and partial sets.

## Retry, resume, and failure handling

- Persist state after each stage. Workers obtain expiring leases atomically; a crashed worker's item becomes reclaimable after lease expiry.
- Retry only classified transient failures (timeouts, connection reset, eligible 429/5xx, database serialization/deadlock). Use capped exponential backoff with jitter and honor `Retry-After`.
- Do not automatically retry permanent parse, validation, authentication/configuration, or source mismatch failures without a code/config/evidence change; quarantine and alert.
- Keep attempt histories/errors safe and structured. A run may be `completed_with_review` when publishable items finish but quarantined cases remain.
- Resume takes a `run_id`, verifies immutable run configuration/deployment compatibility, and continues from the last committed stage. If parser version changes, create a new revision/revalidation run rather than pretending to resume identical work.
- Cancellation is cooperative between work items. Already published transactions stay published; queued/leasing stops safely.
- Dead-letter threshold and retention are configuration. Operators can explicitly requeue with actor/reason, producing an audit event.

## Atomic validation and publication

Parsing commits candidates/evidence separately from public publication. The privileged publication function:

1. begins a transaction and locks the stable draw;
2. checks the candidate is `eligible`, matches the draw/game/ruleset, and is immutable;
3. repeats database cardinality/range/uniqueness checks;
4. checks required validation evidence and absence of open mismatches/review blocks;
5. supersedes any old current revision, publishes the candidate, updates the current pointer, and writes audit events;
6. commits all changes together.

No child row can become publicly readable before commit. Cache invalidation occurs after commit and is retryable. Multi-draw batches are not one giant transaction: the single-draw atomic boundary supports progress/resume and limits locks.

## Manual-review workflow

1. Validation opens a case containing draw/revision, field-level mismatch(s), source observation links/checksums, parser/ruleset versions, and safe previews.
2. Reviewer reproduces parsing from retained evidence, checks at least the registered independent sources, and may attach a third authoritative observation. Access is authenticated and audited.
3. Allowed dispositions:
   - **Accept candidate:** evidence establishes candidate value; record rationale and validator identity.
   - **Correct:** ingest a new source-backed revision and run all validations.
   - **Reject:** keep revision non-public and state why.
   - **Source/parser drift:** disable affected adapter/range, repair adapter, and launch a revalidation run.
4. Resolving a case does not directly edit results or publish. It records evidence/decision; the normal eligibility and publication transaction runs afterward.
5. When a published draw is implicated, the current revision remains visible with a correction-under-review operational flag only if product policy permits; the replacement is hidden until atomically published.
6. Never delete mismatch/evidence history. Restrict raw evidence access and follow the eventual retention/licensing policy.

## Game-specific importer rules

### 4D

- Preserve all winning numbers as four-character strings, including `0000`.
- Require one 1st, one 2nd, one 3rd, Starter positions 1–10, and Consolation positions 1–10: exactly 23 distinct values.
- Map source order deterministically; missing, duplicate, non-digit, extra, or ambiguous entries quarantine the revision.
- All five categories feed 4D number history and analysis; no category may be treated as optional.

### TOTO

- Require six distinct main values and one different additional value.
- Use the date-pinned ruleset for numeric range; do not assume today's range applies to all history.
- Preserve sourced order while treating main numbers as a set for relevant analysis.
- Capture Group 1/2 prize data when semantically clear, but publishable winning-number validity does not depend on optional prize amount/winner count availability.
- Do not misattach “next advertised prize” to the current result; store it as a sourced announcement for its intended draw.

### Singapore Sweep

- Preserve leading zeroes and source display value. Normalize tier, ticket number, series/suffix, and position only under a verified ruleset.
- Validate all expected tiers, per-tier counts, ticket formats, and continuous positions for that historical era before publication.
- Unknown tier labels, changing card/series layouts, combined number ranges, or uncertain prize semantics quarantine the revision.
- Exact historical cardinalities and formats are unresolved source-research items; adapters must not encode guesses.

## Testing requirements

- **Unit:** normalization aliases, Singapore dates, canonical JSON/checksums, seeded sampling, retry classification/backoff, each game/ruleset validator, and statistics domain functions.
- **Adapter contract:** committed legally permissible/synthetic fixtures for success, pagination, encoding, leading zeroes, missing/extra/duplicate fields, layout drift, and malformed responses. Network is disabled in tests.
- **Database:** clean migration, constraints/triggers, cardinalities, revision immutability, publish transaction rollback, concurrent publication, checksums/unique conflicts, audit events, and RLS role matrix.
- **Integration:** fixture → observation → candidate → validation → publication → public DTO; mismatches remain invisible; corrections switch revisions atomically.
- **Idempotency:** replay the same manifest/content multiple times and concurrently; assert identical canonical counts/checksums and no duplicate events except explicit attempt history.
- **Resume/chaos:** terminate after every stage and during retry/lease expiry, resume, and prove no partial public draw or lost completed work.
- **Cross-validation:** frozen population/checksum, deterministic membership, stratum coverage, two independent source evidence, missing-secondary behavior, mismatch expansion/quarantine, and no sample redraw bias.
- **End to end:** English/Chinese latest/archive/draw/4D-number journeys, cache invalidation, stale fallback, accessibility, and non-prediction copy.
- **Operational smoke:** latest mode in dry-run and publish mode, alert emission, coverage reconciliation, backup/restore, and audited correction rollback in a production-like environment.
