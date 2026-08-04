-- Compact, read-only rankings response. No lottery-result data is altered.
create or replace function api_public.get_fourd_rankings(p_as_of date default current_date)
returns table (
  winning_number text, total_appearances integer, appearances_30_days integer,
  appearances_90_days integer, appearances_365_days integer,
  appearances_12_months integer, appearances_24_months integer,
  archive_total_appearances bigint, archive_12_months_appearances bigint,
  archive_24_months_appearances bigint, last_appearance date,
  average_historical_gap numeric, current_gap integer,
  current_gap_to_average_ratio numeric, most_common_prize_type text
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  with published as (
    select r.winning_number::text, d.draw_date, r.prize_type::text
    from public.draws d
    join public.draw_revisions v on v.id = d.current_published_revision_id
    join public.fourd_results r on r.revision_id = v.id
    where d.game_code = '4d' and v.status = 'published' and d.draw_date <= p_as_of
  ), sequenced as (
    select *, draw_date - lag(draw_date) over (partition by winning_number order by draw_date) as gap
    from published
  ), prize_counts as (
    select winning_number, prize_type, count(*) as n,
      row_number() over (partition by winning_number order by count(*) desc,
        case prize_type when 'first' then 1 when 'second' then 2 when 'third' then 3 when 'starter' then 4 else 5 end) as rank
    from published group by winning_number, prize_type
  ), archive as (
    select count(*) as total,
      count(*) filter (where draw_date >= p_as_of - interval '12 months') as y1,
      count(*) filter (where draw_date >= p_as_of - interval '24 months') as y2
    from published
  ), aggregate_numbers as (
    select s.winning_number, count(*)::integer as total_appearances,
      count(*) filter (where draw_date >= p_as_of - 29)::integer as appearances_30_days,
      count(*) filter (where draw_date >= p_as_of - 89)::integer as appearances_90_days,
      count(*) filter (where draw_date >= p_as_of - 364)::integer as appearances_365_days,
      count(*) filter (where draw_date >= p_as_of - interval '12 months')::integer as appearances_12_months,
      count(*) filter (where draw_date >= p_as_of - interval '24 months')::integer as appearances_24_months,
      max(draw_date) as last_appearance, round(avg(gap)::numeric, 2) as average_historical_gap
    from sequenced s group by s.winning_number
  )
  select a.winning_number, a.total_appearances, a.appearances_30_days, a.appearances_90_days,
    a.appearances_365_days, a.appearances_12_months, a.appearances_24_months,
    x.total, x.y1, x.y2, a.last_appearance, a.average_historical_gap,
    (p_as_of - a.last_appearance)::integer,
    round((p_as_of - a.last_appearance)::numeric / nullif(a.average_historical_gap, 0), 2),
    pc.prize_type
  from aggregate_numbers a cross join archive x
  join prize_counts pc on pc.winning_number = a.winning_number and pc.rank = 1
  order by a.winning_number;
$$;

revoke all on function api_public.get_fourd_rankings(date) from public;
grant execute on function api_public.get_fourd_rankings(date) to anon, authenticated;

comment on function api_public.get_fourd_rankings(date) is
  'One row per exact 4D winning number for rankings; text preserves leading zeroes.';
