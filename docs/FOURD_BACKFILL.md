# Singapore 4D historical backfill runbook

## Audit conclusion

The production gap is an ingestion gap, not a Number History defect. The old importer hard-coded a rolling two-year window in both JavaScript and the database RPC, and its discovery list currently exposes only 5 August 2023 onward. Direct, draw-addressed pages on the official Singapore Pools results endpoint remain available from draw 1 on **31 May 1986**. The requested period begins with draw 2419 on 2 August 2006 (there was no draw on 1 August).

A read-only audit on 2 August 2026 parsed every official page from draw 2350 through 5516. All 3,167 pages had a verifiable matching draw identity and the same parseable result layout. In the requested range, draws 2419–5516 comprise **3,098 draws / 71,254 result rows**. Every draw contains one First, Second and Third prize, ten Starter prizes and ten Consolation prizes. The audit found 77 draws with a legitimate repeated winning number (so winning numbers must not be unique) and 7,382 leading-zero result rows in the wider audited sample. No cancelled page or missing draw number was found. The reduced 2020 count is a calendar gap during the COVID-19 suspension, not malformed or cancelled source data.

The supported start is nevertheless pinned to the earliest official page, 31 May 1986, rather than claiming coverage before the official endpoint. One unchanged 4D rule shape covers that period; no new game format was found, so the existing rule set is extended rather than inventing a new version.

## Production prerequisites

1. Review and merge the backfill PR, then apply `20260802000300_enable_fourd_historical_backfill.sql` to production.
2. Confirm Actions secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and take a database backup/PITR bookmark.
3. Run the verification SQL below and retain its output as the pre-import baseline (expected current facts: 316 draws and 7,268 rows, 27 July 2024 through 1 August 2026).
4. Dispatch only one batch at a time. The workflow concurrency lock prevents overlapping 4D writers. Start with 2006, inspect it, then proceed chronologically. Do not dispatch the whole 20-year range: the importer rejects ranges over 370 days.

## Reviewed batches

Each range is inclusive. Counts reflect the official archive as observed on 2 August 2026.

| From | To | Official draws | Draws | Result rows |
|---|---|---:|---:|---:|
| 2006-08-01 | 2006-12-31 | 2419–2484 | 66 | 1,518 |
| 2007-01-01 | 2007-12-31 | 2485–2640 | 156 | 3,588 |
| 2008-01-01 | 2008-12-31 | 2641–2797 | 157 | 3,611 |
| 2009-01-01 | 2009-12-31 | 2798–2953 | 156 | 3,588 |
| 2010-01-01 | 2010-12-31 | 2954–3109 | 156 | 3,588 |
| 2011-01-01 | 2011-12-31 | 3110–3266 | 157 | 3,611 |
| 2012-01-01 | 2012-12-31 | 3267–3423 | 157 | 3,611 |
| 2013-01-01 | 2013-12-31 | 3424–3579 | 156 | 3,588 |
| 2014-01-01 | 2014-12-31 | 3580–3736 | 157 | 3,611 |
| 2015-01-01 | 2015-12-31 | 3737–3892 | 156 | 3,588 |
| 2016-01-01 | 2016-12-31 | 3893–4049 | 157 | 3,611 |
| 2017-01-01 | 2017-12-31 | 4050–4206 | 157 | 3,611 |
| 2018-01-01 | 2018-12-31 | 4207–4362 | 156 | 3,588 |
| 2019-01-01 | 2019-12-31 | 4363–4518 | 156 | 3,588 |
| 2020-01-01 | 2020-12-31 | 4519–4642 | 124 | 2,852 |
| 2021-01-01 | 2021-12-31 | 4643–4798 | 156 | 3,588 |
| 2022-01-01 | 2022-12-31 | 4799–4955 | 157 | 3,611 |
| 2023-01-01 | 2023-12-31 | 4956–5112 | 157 | 3,611 |
| 2024-01-01 | 2024-12-31 | 5113–5268 | 156 | 3,588 |
| 2025-01-01 | 2025-12-31 | 5269–5425 | 157 | 3,611 |
| 2026-01-01 | 2026-08-01 | 5426–5516 | 91 | 2,093 |

The final expected state is 3,098 published draws and 71,254 rows. Given the stated baseline, 2,782 draws and 63,986 rows are new; overlap is intentionally replayed to prove checksums and idempotency without overwriting the 316 verified revisions.

## Actions procedure

For each table row above: open **Actions → Import 4D results → Run workflow**, select `main`, enter `From` and `To`, and dispatch. Save the run URL and emitted `import_run` identifier. Confirm `import_complete`, the expected `drawsFound`, and zero failures. The job retries transient HTTP failures, checkpoints its heartbeat/summary after each draw, and runs the full published-integrity verifier. A stopped or failed job is recovered by rerunning the identical date range: committed draws are checksum no-ops and the first incomplete draw is safely retried. Any “already published with different contents,” identity mismatch, parse failure, or unexpected count is a hard stop for human review.

## Verification SQL

Run after every batch (adding a batch date predicate when comparing its expected count), and run the full query set after the last batch:

```sql
-- Overall coverage.
select count(distinct draw_id) as draws, count(*) as result_rows,
       min(draw_date) as earliest, max(draw_date) as latest
from api_public.published_fourd_results;

-- Must return zero rows: cardinality and category coverage.
select draw_no, draw_date, count(*) as rows,
       count(*) filter (where prize_type = 'first') as first_count,
       count(*) filter (where prize_type = 'second') as second_count,
       count(*) filter (where prize_type = 'third') as third_count,
       count(*) filter (where prize_type = 'starter') as starter_count,
       count(*) filter (where prize_type = 'consolation') as consolation_count
from api_public.published_fourd_results
group by draw_id, draw_no, draw_date
having count(*) <> 23
    or count(*) filter (where prize_type = 'first') <> 1
    or count(*) filter (where prize_type = 'second') <> 1
    or count(*) filter (where prize_type = 'third') <> 1
    or count(*) filter (where prize_type = 'starter') <> 10
    or count(*) filter (where prize_type = 'consolation') <> 10;

-- Must return zero rows: invalid positions or lost leading-zero formatting.
select * from api_public.published_fourd_results
where winning_number !~ '^[0-9]{4}$'
   or (prize_type in ('first','second','third') and position <> 1)
   or (prize_type in ('starter','consolation') and position not between 1 and 10);

-- Per-year reconciliation (compare with the reviewed table).
select extract(year from draw_date)::int as year,
       count(distinct draw_id) as draws, count(*) as result_rows
from api_public.published_fourd_results
where draw_date between date '2006-08-01' and date '2026-08-01'
group by 1 order by 1;

-- Failed/reviewable runs and unpublished revisions must be explained.
select id, requested_from, requested_to, status, heartbeat_at, summary
from public.import_runs where game_code = '4d' order by created_at desc;
select d.draw_no, d.draw_date, r.status, r.normalized_checksum, r.import_run_id
from public.draw_revisions r join public.draws d on d.id = r.draw_id
where d.game_code = '4d' and r.status <> 'published';
```

## Recovery and rollback

For a transient interruption, do not delete anything: inspect the failed run summary, correct the source/network issue, and rerun the same dates. For a source mismatch, stop later batches and preserve the published revision while reviewing the official page and checksums.

If a reviewed batch must be removed, restore the pre-run backup/PITR point whenever practical. Otherwise use the recorded import-run UUID in a transaction **only after confirming it contains exclusively newly created revisions**; unchanged pre-existing draws are not attached to that run. Keep the failed `import_runs` record for audit:

```sql
begin;
set constraints all deferred;
create temporary table rollback_revisions as
select r.id, r.draw_id from public.draw_revisions r
where r.import_run_id = :'run_id';
update public.draws d set current_published_revision_id = null, updated_at = now()
where d.current_published_revision_id in (select id from rollback_revisions);
delete from public.fourd_results where revision_id in (select id from rollback_revisions);
delete from public.draw_revisions where id in (select id from rollback_revisions);
delete from public.draws d where d.id in (select draw_id from rollback_revisions)
  and not exists (select 1 from public.draw_revisions r where r.draw_id = d.id);
update public.import_runs set status = 'cancelled', completed_at = coalesce(completed_at, now()),
  summary = summary || jsonb_build_object('rolled_back_at', now(), 'rollback_reason', :'reason')
where id = :'run_id';
commit;
```

Rerun all verification SQL after recovery or rollback.
