# 4D rankings performance

## Before

The cold path downloaded approximately 71,000 published result rows in roughly 71 requests of 1,000 rows, then grouped and recalculated every number in the application server. A deterministic 71,000-row benchmark (`node scripts/benchmark-rankings.mjs`, 25 runs, median, Node 22) measured **11.08 ms** for application-side generation alone. This excludes database, network, JSON parsing, and 71-request latency, so production wall time was necessarily higher.

## After

Migration `20260804000100_add_fourd_rankings_rpc.sql` installs the read-only `api_public.get_fourd_rankings` SQL function. PostgreSQL scans published revisions once, partitions exact `winning_number` text (therefore retaining values such as `0007`), and returns one compact row per number with period counts, gaps, prize mode, and score inputs. There is no query per number and no source table is changed.

The same local benchmark measured **4.48 ms** median to sort the already aggregated response. Transfer falls from about **71,000 raw rows over ~71 requests** to at most **10,000 aggregate rows in one RPC** (and typically zero database rows on a cache hit). The benchmark is an application-generation comparison, not a claim about production database latency; use `EXPLAIN (ANALYZE, BUFFERS)` around the function's query on staging for database-specific timings.

## Deploy and cache operations

Apply migrations with `supabase db push` (or the normal CI migration job) before deploying the application. The server cache revalidates every 3,600 seconds, so a new draw is stale for no more than one hour. An import pipeline can make it visible immediately by calling Next.js `revalidateTag("fourd-rankings")` in a protected server action/route after the transaction publishes the revision; redeploying also starts with an empty cache. Tab and period changes reuse the same cached aggregate response and only sort the compact rows.
