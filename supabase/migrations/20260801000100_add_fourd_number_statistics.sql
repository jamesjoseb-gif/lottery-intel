-- Aggregate only current, published revisions and expose no private ingestion data.
create or replace view api_public.fourd_number_statistics
with (security_invoker = true, security_barrier = true) as
select
  result.winning_number,
  count(*)::integer as appearances,
  count(*) filter (where result.prize_type = 'first')::integer as first_prizes,
  count(*) filter (where result.prize_type = 'second')::integer as second_prizes,
  count(*) filter (where result.prize_type = 'third')::integer as third_prizes,
  count(*) filter (where result.prize_type = 'starter')::integer as starter_prizes,
  count(*) filter (where result.prize_type = 'consolation')::integer as consolation_prizes,
  max(draw.draw_date) as last_seen_on
from public.draws draw
join public.draw_revisions revision on revision.id = draw.current_published_revision_id
join public.fourd_results result on result.revision_id = revision.id
where draw.game_code = '4d' and revision.status = 'published'
group by result.winning_number;

grant select on api_public.fourd_number_statistics to anon, authenticated;
