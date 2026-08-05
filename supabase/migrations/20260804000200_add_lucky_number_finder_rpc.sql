-- One bounded aggregate request for the Lucky Number Finder. This reads only
-- currently published 4D revisions and does not change import or result tables.
create or replace function api_public.find_lucky_fourd_numbers(
  p_digits text,
  p_mode text default 'ordered',
  p_sort text default 'score',
  p_limit integer default 100
)
returns table (
  winning_number text,
  historical_activity_score integer,
  activity_label text,
  total_appearances bigint,
  last_appearance date,
  days_since_last_appearance integer,
  average_gap integer,
  most_common_prize text,
  appearances_last_12_months bigint,
  appearances_last_24_months bigint
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
with published as (
  select result.winning_number, draw.draw_date, result.prize_type
  from public.draws draw
  join public.draw_revisions revision on revision.id = draw.current_published_revision_id
  join public.fourd_results result on result.revision_id = revision.id
  where draw.game_code = '4d' and revision.status = 'published'
), archive as (
  select count(*)::numeric total,
    count(*) filter (where draw_date >= current_date - 365)::numeric last_12,
    count(*) filter (where draw_date >= current_date - 730)::numeric last_24
  from published
), matched as (
  select * from published
  where p_digits ~ '^[0-9]{1,4}$' and (
    (p_mode = 'consecutive' and winning_number like '%' || p_digits || '%') or
    (p_mode <> 'consecutive' and winning_number ~ ('^' || array_to_string(regexp_split_to_array(p_digits, ''), '.*') || '.*$'))
  )
), previous as (
  select *, lag(draw_date) over (partition by winning_number order by draw_date) previous_date
  from matched
), aggregated as (
  select winning_number, count(*)::bigint total_appearances, max(draw_date) last_appearance,
    round(avg(draw_date - previous_date) filter (where previous_date is not null))::integer average_gap,
    count(*) filter (where draw_date >= current_date - 365)::bigint appearances_last_12_months,
    count(*) filter (where draw_date >= current_date - 730)::bigint appearances_last_24_months,
    (array_agg(prize_type order by prize_count desc,
      case prize_type when 'first' then 1 when 'second' then 2 when 'third' then 3 when 'starter' then 4 else 5 end))[1] most_common_prize
  from (select previous.*, count(*) over (partition by winning_number, prize_type) prize_count from previous) counted
  group by winning_number
), scored as (
  select aggregated.*,
    (current_date - last_appearance)::integer days_since_last_appearance,
    least(100, greatest(0,
      coalesce(round(least(1, (total_appearances::numeric / nullif(archive.total / 10000, 0)) / 2) * 40), 0)::integer
      + case when current_date - last_appearance <= 30 then 30 when current_date - last_appearance <= 90 then 25
        when current_date - last_appearance <= 180 then 20 when current_date - last_appearance <= 365 then 15
        when current_date - last_appearance <= 730 then 8 else 0 end
      + coalesce(round(least(1, (appearances_last_12_months::numeric / nullif(archive.last_12 / 10000, 0)) / 2) * 20), 0)::integer
      + coalesce(round(least(1, (appearances_last_24_months::numeric / nullif(archive.last_24 / 10000, 0)) / 2) * 10), 0)::integer
    ))::integer historical_activity_score
  from aggregated cross join archive
), labeled as (
  select *, case when historical_activity_score < 20 then 'Very Low' when historical_activity_score < 40 then 'Low'
    when historical_activity_score < 60 then 'Moderate' when historical_activity_score < 80 then 'High' else 'Very High' end activity_label
  from scored
)
select winning_number, historical_activity_score, activity_label, total_appearances, last_appearance,
  days_since_last_appearance, average_gap, most_common_prize,
  appearances_last_12_months, appearances_last_24_months
from labeled
order by
  case when p_sort = 'score' then historical_activity_score end desc,
  case when p_sort = 'score' then total_appearances end desc,
  case when p_sort = 'appearances' then total_appearances end desc,
  case when p_sort = 'appearances' then historical_activity_score end desc,
  case when p_sort = 'recent' then last_appearance end desc,
  case when p_sort = 'recent' then total_appearances end desc,
  case when p_sort = 'absent' then days_since_last_appearance end desc,
  case when p_sort = 'absent' then total_appearances end desc,
  winning_number
limit least(greatest(coalesce(p_limit, 100), 0), 100);
$$;

revoke all on function api_public.find_lucky_fourd_numbers(text, text, text, integer) from public;
grant execute on function api_public.find_lucky_fourd_numbers(text, text, text, integer) to anon, authenticated;
