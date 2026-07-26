# Lottery Intel — Decision Register

## Status definitions

- **Locked:** product or technology direction supplied for Sprint 0. Implementation must comply unless a later explicit decision supersedes it.
- **Assumption:** implementation interpretation used to make this blueprint actionable; validate before relying on it in production.
- **Unresolved:** requires source research, policy, measurement, or stakeholder decision. It must not be silently guessed.

## Locked decisions

| ID | Decision | Consequence |
|---|---|---|
| L-01 | V1 is a website only. | Build a responsive web experience; no native client/API product commitment. |
| L-02 | V1 covers Singapore 4D, TOTO, and Singapore Sweep. | Canonical game codes and all scope/coverage reports include exactly these games. |
| L-03 | English and Chinese are the initial languages. | All user-facing journeys, metadata, errors, and responsible-use copy ship in both languages. |
| L-04 | There is no AI prediction. | No predicted numbers, prediction scoring, AI claims, or predictive language. |
| L-05 | There is no premium subscription. | No billing, paywall, premium entitlement, or premium-only result/statistics path. |
| L-06 | There is no Compare Numbers feature. | V1 supports one canonical 4D profile at a time, not comparison workflows. |
| L-07 | There is no mobile app in V1. | Mobile work is responsive website quality only. |
| L-08 | Use the complete historical data available, not only 20 years. | Backfill begins at the earliest viable source coverage and reports gaps/boundaries; it does not apply an arbitrary cutoff. |
| L-09 | 4D analysis includes 1st, 2nd, 3rd, Starter, and Consolation. | A publishable draw contains all 23 entries, and every category contributes to history/statistics. |
| L-10 | TOTO public display focuses on Group 1 and Group 2, while storing full winning-number data needed for analysis. | Store six main plus additional number; public prize presentation prioritizes groups 1/2 without discarding required result facts. |
| L-11 | Historical draws may be accepted after random sample verification against two independent sources. | Store a reproducible sample plan/membership/evidence. Independence is provenance-based; sampled mismatches block affected draws and trigger review. |
| L-12 | Mismatches must be logged and held for manual review. | No last-write-wins or silent source preference; affected revisions remain non-public until an audited disposition. |
| L-13 | Supabase is the database. | PostgreSQL, migrations, RLS, transactional publication, and Supabase operational controls form the system of record. |
| L-14 | Next.js is the website framework. | Use App Router web rendering/localization/cache patterns; importer remains a separate backend workload. |
| L-15 | Importers are resumable, idempotent, and modular. | Persist work/checkpoints/checksums; enforce uniqueness; separate source adapters from orchestration and publication. |
| L-16 | The system supports automatic post-draw updates later. | Latest mode is independently runnable/schedulable now; schedules and source delays are configuration. |
| L-17 | Historical statistics must not be described as predicting future results. | Product copy, metadata, statistics labels, and editorial content explicitly separate description from prediction. |

## Architecture assumptions

| ID | Assumption | Validation/impact |
|---|---|---|
| A-01 | “Chinese” initially means Simplified Chinese for Singapore (`zh-SG`), with English `en-SG`. | Confirm with product/content stakeholders; Traditional Chinese would add a locale/content scope. |
| A-02 | Public use requires no account and result facts are readable anonymously. | Consistent with free/non-premium positioning; confirm analytics/privacy and abuse controls separately. |
| A-03 | A stable draw identity is `(game, normalized draw_no)` and multiple same-day draws must be representable. | Validate against complete official numbering conventions before import. |
| A-04 | Winning data and corrections need immutable revisions, not in-place edits. | Enables atomic publication and auditability required by mismatch/correction handling. |
| A-05 | A historical sample acceptance applies to an approved source/ruleset/date stratum, not indiscriminately to every era. | Prevents a recent-data-heavy sample from certifying structurally different early history. |
| A-06 | Latest draws receive per-draw corroboration rather than the historical sampling shortcut. | Conservative implementation of “only officially published results”; revise only through an explicit source-policy decision. |
| A-07 | Optional TOTO Group 1/2 amount/winner fields can be absent while verified winning numbers publish. | Avoids inventing zero values and makes number integrity independent from supplemental availability. |
| A-08 | Next.js normally reads Supabase with the public/publishable role, including server rendering. | Preserves RLS as defense in depth; privileged imports are separately deployed. |
| A-09 | Coverage transparency is a product requirement: absent coverage is not equivalent to a number never appearing. | Required to accurately present “complete available” rather than imply mathematically complete history. |
| A-10 | Sprint 0 creates documentation only: no importer, behavior, or prototype schema change. | This deliverable must leave application runtime and `database/schema.sql` unchanged. |

## Unresolved technical and policy questions

### Sources and data rights

| ID | Question / required outcome |
|---|---|
| U-01 | Which verified primary and secondary source(s) cover each game and historical era? Record ownership, authority, independence group, format, stability, and gaps. No external URL is approved by this blueprint. |
| U-02 | Do source terms/licences permit automated retrieval, retention of raw artifacts, transformation, and public redistribution? Define attribution and retention requirements. |
| U-03 | How far back does complete available history extend per game, and which gaps/special draws exist? Produce a source-backed coverage manifest. |
| U-04 | Can latest draws be confirmed promptly by two genuinely independent sources? Define grace periods and a manual official-source override policy if not. |

### Historical rules and semantics

| ID | Question / required outcome |
|---|---|
| U-05 | What TOTO number ranges, winning-number counts, additional-number semantics, draw-number formats, and rule-change effective dates apply across all history? |
| U-06 | What Singapore Sweep ticket/card/series formats, prize tiers, cardinalities, labels, and rule-change dates apply across all history? This blocks final Sweep constraints/adapters. |
| U-07 | Are 4D result values always unique across all 23 positions, and are there exceptional/cancelled/special formats? Confirm before enabling the proposed uniqueness constraint for all eras. |
| U-08 | What exactly constitutes Group 1/2 “focus”: amounts, winner counts, jackpot allocation, next advertised prize, or a subset? Define missing-value presentation. |
| U-09 | Which timezone/source timestamp is authoritative for exact draw time and publication time? The calendar `draw_date` remains Singapore-local. |

### Validation and operations

| ID | Question / required outcome |
|---|---|
| U-10 | What random-sample size, confidence/risk threshold, stratification, and escalation rule are approved per game/era? Store these parameters and the seeded algorithm in every run. |
| U-11 | Who can review mismatches, what evidence is sufficient, and is dual approval required for corrections/overrides? Define identities, SLA, and escalation. |
| U-12 | What are expected post-draw schedules, grace windows, retry ceilings, freshness SLOs, and holiday/special-draw rules for each game? |
| U-13 | Which job runner/scheduler, monitoring/error platform, and cache-revalidation mechanism will production use? They must keep privileged secrets outside Next.js. |
| U-14 | What backup/restore targets, retention periods (canonical, audit, validation, logs, raw artifacts), and disaster-recovery RPO/RTO are required? |
| U-15 | Should public pages expose source attribution, verification timestamps, correction notices, and revision history? Internal evidence remains restricted regardless. |

### Website and analytics

| ID | Question / required outcome |
|---|---|
| U-16 | Confirm Simplified vs Traditional Chinese terminology, translation ownership/review, locale URL format, and glossary for game/prize/statistics terms. |
| U-17 | Finalize which descriptive statistics ship in MVP and their exact formulas—especially current/longest gap boundaries and behavior across missing coverage. Version formulas and test fixtures. |
| U-18 | Define public archive pagination/filter requirements, caching/freshness thresholds, traffic/load assumptions, and whether browser-direct Supabase reads are needed at all. |
| U-19 | Confirm accessibility test tooling/browsers, analytics consent/privacy policy, responsible-gambling wording, and any Singapore regulatory/legal review. |

## Decision governance

- A locked decision changes only through a dated decision entry naming approver, rationale, and affected documents/migrations.
- Resolve each unresolved item with evidence and an ADR or an appended decision record before implementing the dependent constraint/adapter.
- Assumptions that prove false must be promoted to an explicit decision; do not quietly change only one document.
- Database, importer, website, and runbooks must share canonical terms: **staged → validating/quarantined → eligible → published/superseded/rejected**; only the current published revision is public.
