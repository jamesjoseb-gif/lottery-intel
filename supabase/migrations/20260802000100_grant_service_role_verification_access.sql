-- PostgREST checks the requested profile schema before resolving a view. The
-- service role is used by the production verification jobs, so grant it
-- explicit access rather than relying on Supabase's defaults for public.
grant usage on schema api_public to service_role;

grant select on
  api_public.published_toto_results,
  api_public.published_sweep_results
to service_role;

-- Both published-result views are security-invoker views. Give the verifier
-- the corresponding access to their underlying relations as well.
grant usage on schema public to service_role;
grant select (id, game_code, draw_no, draw_date, current_published_revision_id)
  on public.draws to service_role;
grant select (id, status, published_at)
  on public.draw_revisions to service_role;
grant select (revision_id, number_kind, position, winning_number)
  on public.toto_results to service_role;
grant select (revision_id, tier_code, source_label, position, ticket_number, series, entry_suffix, source_display_value)
  on public.sweep_results to service_role;

-- Keep the importer RPC permissions explicit alongside the permissions used
-- by the verification phase of the same production jobs.
grant execute on function public.import_toto_v1_draw(uuid, text, date, text, text, jsonb)
  to service_role;
grant execute on function public.import_sweep_v1_draw(uuid, text, date, text, text, jsonb)
  to service_role;
