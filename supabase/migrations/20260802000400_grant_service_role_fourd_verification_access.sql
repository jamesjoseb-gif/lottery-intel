-- The 4D importer and its post-import verifier use the service role. As with
-- the TOTO and Sweep verifiers, PostgREST requires both access to the exposed
-- security-invoker view and column-level access to its underlying relations.
grant usage on schema api_public to service_role;
grant select on api_public.published_fourd_results to service_role;

grant usage on schema public to service_role;
grant select (revision_id, prize_type, position, winning_number)
  on public.fourd_results to service_role;

-- Keep publication filtering in the existing security-barrier view. No table
-- permission is granted to anon/authenticated here and no RLS policy changes.
