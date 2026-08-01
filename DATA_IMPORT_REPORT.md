# TOTO and Big Sweep import verification

Verified on 1 August 2026:

- **Imported production TOTO draws:** not verified (no production Supabase credentials were available in this workspace).
- **Imported production Big Sweep draws:** not verified (no production Supabase credentials were available in this workspace).
- **Latest production draw/date range:** not verified for either game for the same reason. No production data was invented or claimed.
- **Local validators:** parser and integrity-verifier unit tests pass against deterministic official-layout fixtures, including invalid and changed layouts.
- **Import TOTO results:** scheduled at 11:30 and 13:30 UTC every Monday and Thursday (19:30 and 21:30 Singapore time), plus manual dispatch.
- **Import Big Sweep results:** scheduled at 13:30 and 15:30 UTC on the 8th of each month, after the first-Wednesday publication window (21:30 and 23:30 Singapore time), plus manual dispatch.

## Production blockers and owner action

1. Apply `supabase/migrations/20260801000200_add_toto_sweep_import.sql` to production.
2. Configure repository Actions secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` with a service-role credential authorized to create import runs and execute the importer RPCs.
3. Manually dispatch each workflow for the desired historical date range. After both succeed, record the returned production counts/ranges here; none can be truthfully reported before credentialed execution.
