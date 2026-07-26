# Lottery Intel V1

## Local setup

1. Run `supabase start`, then `supabase db reset` to apply migrations and the temporary V1 fixture.
2. Copy the local API URL and anon key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm install && npm run dev`.

## Deploy

1. Link the production Supabase project, run `supabase db push`, and add `api_public` to the project's exposed API schemas.
2. Load verified published results with the importer. For a test environment only, run `psql "$DATABASE_URL" -f supabase/seed.sql`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the hosting provider.
4. Deploy the current Next.js branch with `npm ci && npm run build`, then smoke-test `/`, `/4d`, `/toto`, `/singapore-sweep`, and `/number/1234`.

The browser-facing application has read-only access to the `api_public` published-result views. The fixture is clearly marked temporary and must not replace verified production data.

## Import Singapore 4D (V1)

After applying migrations, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run:

```bash
npm run import:4d
```

The command reads Singapore Pools' official 4D archive, keeps only draws dated within the last two years, validates the required 23 four-digit strings, and publishes each draw transactionally. Re-running it is safe: an identical published draw is counted as unchanged rather than inserted again. A published draw whose source values changed is rejected for review instead of being overwritten.
