create schema if not exists api_public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'games', 'game_rule_sets', 'draws', 'draw_revisions', 'fourd_results',
    'toto_results', 'sweep_results', 'import_runs', 'validation_runs',
    'source_observations', 'manual_reviews', 'audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end
$$;

revoke all on all sequences in schema public from anon, authenticated;

create policy games_public_read on public.games for select to anon, authenticated
  using (active);

create policy published_draws_public_read on public.draws for select to anon, authenticated
  using (current_published_revision_id is not null);

create policy published_revisions_public_read on public.draw_revisions for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1 from public.draws draw
      where draw.id = draw_revisions.draw_id
        and draw.current_published_revision_id = draw_revisions.id
    )
  );

create policy published_fourd_results_public_read on public.fourd_results for select to anon, authenticated
  using (exists (
    select 1 from public.draw_revisions revision
    join public.draws draw on draw.id = revision.draw_id
    where revision.id = fourd_results.revision_id
      and revision.status = 'published'
      and draw.current_published_revision_id = revision.id
  ));

create policy published_toto_results_public_read on public.toto_results for select to anon, authenticated
  using (exists (
    select 1 from public.draw_revisions revision
    join public.draws draw on draw.id = revision.draw_id
    where revision.id = toto_results.revision_id
      and revision.status = 'published'
      and draw.current_published_revision_id = revision.id
  ));

create policy published_sweep_results_public_read on public.sweep_results for select to anon, authenticated
  using (exists (
    select 1 from public.draw_revisions revision
    join public.draws draw on draw.id = revision.draw_id
    where revision.id = sweep_results.revision_id
      and revision.status = 'published'
      and draw.current_published_revision_id = revision.id
  ));

grant usage on schema api_public to anon, authenticated;
grant select (code, name) on public.games to anon, authenticated;
grant select (id, game_code, draw_no, draw_date, drawn_at, current_published_revision_id)
  on public.draws to anon, authenticated;
grant select (id, draw_id, status, published_at) on public.draw_revisions to anon, authenticated;
grant select (revision_id, prize_type, position, winning_number)
  on public.fourd_results to anon, authenticated;
grant select (revision_id, number_kind, position, winning_number)
  on public.toto_results to anon, authenticated;
grant select (revision_id, tier_code, source_label, position, ticket_number, series, entry_suffix, source_display_value)
  on public.sweep_results to anon, authenticated;

create view api_public.published_draws
with (security_invoker = true, security_barrier = true) as
select
  draw.id,
  draw.game_code,
  draw.draw_no,
  draw.draw_date,
  draw.drawn_at,
  revision.id as revision_id,
  revision.published_at
from public.draws draw
join public.draw_revisions revision on revision.id = draw.current_published_revision_id
where revision.status = 'published';

create view api_public.published_fourd_results
with (security_invoker = true, security_barrier = true) as
select draw.id as draw_id, draw.draw_no, draw.draw_date, revision.published_at,
       result.prize_type, result.position, result.winning_number
from public.draws draw
join public.draw_revisions revision on revision.id = draw.current_published_revision_id
join public.fourd_results result on result.revision_id = revision.id
where draw.game_code = '4d' and revision.status = 'published';

create view api_public.published_toto_results
with (security_invoker = true, security_barrier = true) as
select draw.id as draw_id, draw.draw_no, draw.draw_date, revision.published_at,
       result.number_kind, result.position, result.winning_number
from public.draws draw
join public.draw_revisions revision on revision.id = draw.current_published_revision_id
join public.toto_results result on result.revision_id = revision.id
where draw.game_code = 'toto' and revision.status = 'published';

create view api_public.published_sweep_results
with (security_invoker = true, security_barrier = true) as
select draw.id as draw_id, draw.draw_no, draw.draw_date, revision.published_at,
       result.tier_code, result.source_label, result.position, result.ticket_number,
       result.series, result.entry_suffix, result.source_display_value
from public.draws draw
join public.draw_revisions revision on revision.id = draw.current_published_revision_id
join public.sweep_results result on result.revision_id = revision.id
where draw.game_code = 'sweep' and revision.status = 'published';

grant select on all tables in schema api_public to anon, authenticated;
revoke create on schema api_public from public;
revoke all on schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
