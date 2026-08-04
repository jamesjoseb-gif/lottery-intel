-- Calculate the four public 4D ranking lists in Postgres. Keeping this work in the
-- database avoids downloading the complete result archive during a page render.
create or replace function api_public.get_fourd_rankings(
  p_period text default '90',
  p_limit integer default 50
)
returns table (
  ranking_kind text,
  ranking_position bigint,
  number text,
  total_appearances bigint,
  period_appearances bigint,
  last_appearance date,
  days_since_last_appearance integer,
  average_historical_gap integer,
  current_gap_versus_average double precision,
  historical_activity_score integer,
  activity_label text,
  most_common_prize_type text,
  result_row_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
with recursive
parameters as (
  select
    case when p_period in ('30', '90', '365', 'all') then p_period else '90' end as period,
    least(greatest(coalesce(p_limit, 50), 0), 50) as result_limit
),
published as (
  select result.winning_number as number, draw.draw_date, result.prize_type
  from public.draws draw
  join public.draw_revisions revision on revision.id = draw.current_published_revision_id
  join public.fourd_results result on result.revision_id = revision.id
  where draw.game_code = '4d' and revision.status = 'published'
),
archive as (
  select count(*)::bigint as total,
    count(*) filter (where draw_date >= current_date - 365)::bigint as last_12,
    count(*) filter (where draw_date >= current_date - 730)::bigint as last_24
  from published
),
with_previous as (
  select *, lag(draw_date) over (partition by number order by draw_date) as previous_date
  from published
),
aggregated as (
  select
    number,
    count(*)::bigint as total_appearances,
    count(*) filter (
      where parameters.period = 'all'
        or draw_date >= current_date - (
          case parameters.period
            when '30' then 30
            when '90' then 90
            when '365' then 365
            else 0
          end
        )
    )::bigint as period_appearances,
    count(*) filter (where draw_date >= current_date - 365)::bigint as last_12,
    count(*) filter (where draw_date >= current_date - 730)::bigint as last_24,
    max(draw_date) as last_appearance,
    round(
      avg(draw_date - previous_date)
        filter (where previous_date is not null)
    )::integer as average_historical_gap,
    (array_agg(prize_type order by prize_count desc,
      case prize_type when 'first' then 1 when 'second' then 2 when 'third' then 3 when 'starter' then 4 else 5 end))[1] as most_common_prize_type
  from (
    select with_previous.*,
      count(*) over (partition by number, prize_type) as prize_count
    from with_previous
  ) appearances
  cross join parameters
  group by number
),
scored as (
  select aggregated.*,
    (current_date - aggregated.last_appearance)::integer as days_since_last_appearance,
    case when aggregated.average_historical_gap > 0
      then (current_date - aggregated.last_appearance)::double precision / aggregated.average_historical_gap
      else null end as current_gap_versus_average,
    least(100, greatest(0,
      coalesce(round(least(1, (aggregated.total_appearances::numeric / nullif(archive.total::numeric / 10000, 0)) / 2) * 40), 0)::integer
      + case when current_date - aggregated.last_appearance <= 30 then 30 when current_date - aggregated.last_appearance <= 90 then 25
          when current_date - aggregated.last_appearance <= 180 then 20 when current_date - aggregated.last_appearance <= 365 then 15
          when current_date - aggregated.last_appearance <= 730 then 8 else 0 end
      + coalesce(round(least(1, (aggregated.last_12::numeric / nullif(archive.last_12::numeric / 10000, 0)) / 2) * 20), 0)::integer
      + coalesce(round(least(1, (aggregated.last_24::numeric / nullif(archive.last_24::numeric / 10000, 0)) / 2) * 10), 0)::integer
    ))::integer as historical_activity_score,
    archive.total as result_row_count
  from aggregated cross join archive
),
labeled as (
  select *, case when historical_activity_score < 20 then 'Very Low' when historical_activity_score < 40 then 'Low'
    when historical_activity_score < 60 then 'Moderate' when historical_activity_score < 80 then 'High' else 'Very High' end as activity_label,
    greatest(1, max(period_appearances) over ()) as maximum_period
  from scored
),
ranked as (
  select 'hot'::text as ranking_kind, row_number() over (order by
      historical_activity_score * .5 + period_appearances::numeric / maximum_period * 35
        + greatest(0, 1 - days_since_last_appearance::numeric / 365) * 15 desc,
      period_appearances desc, last_appearance desc, number) as ranking_position, labeled.*
  from labeled
  union all
  select 'cold', row_number() over (order by period_appearances, days_since_last_appearance desc, historical_activity_score, number), labeled.*
  from labeled where total_appearances >= 2 and average_historical_gap is not null
  union all
  select 'overdue', row_number() over (order by current_gap_versus_average desc, days_since_last_appearance desc, number), labeled.*
  from labeled where total_appearances >= 2 and current_gap_versus_average > 1
  union all
  select 'recent', row_number() over (order by last_appearance desc, period_appearances desc, number), labeled.*
  from labeled
)
select ranking_kind, ranking_position, number, total_appearances, period_appearances, last_appearance,
  days_since_last_appearance, average_historical_gap, current_gap_versus_average,
  historical_activity_score, activity_label, most_common_prize_type, result_row_count
from ranked cross join parameters
where ranking_position <= parameters.result_limit
order by ranking_kind, ranking_position;
$$;

revoke all on function api_public.get_fourd_rankings(text, integer) from public;
grant execute on function api_public.get_fourd_rankings(text, integer) to anon, authenticated;
