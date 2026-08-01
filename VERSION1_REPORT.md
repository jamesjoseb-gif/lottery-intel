# Lottery Intel Version 1 delivery report

## Delivered

- Application identity: the approved search-mark favicon is served from `app/icon.svg`; root metadata and the global layout use a deterministic system-font stack.
- Navigation and search: the header links every V1 results area and Statistics; 4D searches accept one to four digits, preserve leading zeroes, reject empty input, and are covered by normalization tests.
- Public pages: the homepage is a focused entry point for search and latest results. 4D, TOTO, and Big Sweep pages render explicit loading-error and no-data states rather than assuming records exist.
- Statistics: `/statistics` displays the most frequently appearing published 4D numbers and links each number to its history. The `api_public.fourd_number_statistics` migration derives counts only from the current published revision.
- Data integrity: `scripts/verify-4d-integrity.mjs` checks the 23 expected slots, prize counts, positions, and four-character number format. Repeated winning numbers across different slots remain valid, matching the official data model.
- Automation: the pull-request CI workflow installs from the lockfile and runs unit tests, TypeScript, the production build, and whitespace checks. The manual importer also installs reproducibly and runs tests before importing.

## Verification commands

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
git diff --check
```

## Deployment requirements and remaining external work

1. Apply all Supabase migrations, including `20260801000100_add_fourd_number_statistics.sql`.
2. Expose the `api_public` schema in the Supabase API settings and configure the public URL and publishable key in the deployment environment.
3. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets before running the manual importer.
4. Run `npm run verify:4d` against the deployed database after import. This network-backed check is intentionally not part of PR CI because CI has no production credentials.

## Scope statement

Version 1 reports historical published data only. It does not predict results, guarantee winnings, or replace the official Singapore Pools publication.
