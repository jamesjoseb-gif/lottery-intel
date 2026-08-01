# TOTO and Big Sweep import verification

Live source verification was run against Singapore Pools on 1 August 2026 with `npm run verify:live`.

- **TOTO archive:** 314 draws, from draw 3891 on 31 July 2023 through current draw 4204 on 30 July 2026. The latest official detail page parsed all six main numbers and the additional number (7 result rows).
- **Big Sweep archive:** 37 draws, from draw 1056 on 5 July 2023 through current draw 1092 on 1 July 2026.
- **Big Sweep latest detail:** all 142 displayed result rows were parsed across every official tier: first (1), second (1), third (1), jackpot (10), lucky (10), gift (30), consolation (30), participation (50), and 2D delight endings (9).
- **Historical ranges:** the smoke check selects the complete date range exposed by each live archive and fails unless the selected count equals the discovered count.
- **Layout monitoring:** `npm run verify:live` fetches both official archives and their latest detail pages. It exits non-zero with a `LIVE SOURCE VERIFICATION FAILED` message when discovery, identity, result cardinality, tier coverage, or date-range selection changes. Both scheduled importer workflows run it before writing data.
- **Deterministic coverage:** local fixtures continue to test parsing, validation failures, historical selection, latest/single/backfill mode selection, idempotent checksums, and both the official legacy `<span1>` group heading and standard `<span>` markup.
- **Automation:** TOTO checks twice after each Monday and Thursday draw. Big Sweep checks every Wednesday at 21:30 Singapore time and retries at 23:30; idempotent imports make weekly checks safe while covering the first-Wednesday publication day.

## Production blockers and owner action

Production imports were not executed because this workspace has no production Supabase credentials. Before enabling writes:

1. Apply `supabase/migrations/20260801000200_add_toto_sweep_import.sql` to production.
2. Configure repository Actions secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` with a service-role credential authorized to create import runs and execute the importer RPCs.
3. Manually dispatch each workflow for the desired exposed historical range, then run the database integrity verifiers.
