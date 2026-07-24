-- Lottery Intel analytics layer
-- Run after database/schema.sql

create table if not exists public.number_search_events (
  id bigint generated always as identity primary key,
  winning_number char(4) not null check (winning_number ~ '^[0-9]{4}$'),
  searched_at timestamptz not null default now(),
  session_hash text,
  source_path text
);

create index if not exists number_search_events_number_idx
  on public.number_search_events (winning_number);

create index if not exists number_search_events_searched_at_idx
  on public.number_search_events (searched_at desc);

create table if not exists public.weekly_insight_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending' check (status in ('pending','active','unsubscribed','bounced')),
  confirmation_token_hash text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lower(email))
);

create materialized view if not exists public.four_d_number_stats as
with published_draws as (
  select
    d.id,
    d.draw_no,
    d.draw_date,
    dense_rank() over (order by d.draw_date, d.draw_no) as draw_index
  from public.draws d
  where d.game = '4d' and d.status = 'published'
),
appearances as (
  select
    r.winning_number,
    r.prize_type,
    d.draw_no,
    d.draw_date,
    d.draw_index,
    lag(d.draw_index) over (
      partition by r.winning_number
      order by d.draw_index
    ) as previous_draw_index
  from public.four_d_results r
  join published_draws d on d.id = r.draw_id
),
aggregated as (
  select
    winning_number,
    count(*)::integer as total_appearances,
    count(*) filter (where prize_type = 'first')::integer as first_count,
    count(*) filter (where prize_type = 'second')::integer as second_count,
    count(*) filter (where prize_type = 'third')::integer as third_count,
    count(*) filter (where prize_type = 'starter')::integer as starter_count,
    count(*) filter (where prize_type = 'consolation')::integer as consolation_count,
    max(draw_date) as last_appeared_at,
    max(draw_index) as last_draw_index,
    round(avg(draw_index - previous_draw_index) filter (where previous_draw_index is not null), 2) as average_gap,
    max(draw_index - previous_draw_index) filter (where previous_draw_index is not null) as longest_gap
  from appearances
  group by winning_number
),
latest as (
  select coalesce(max(draw_index), 0) as latest_draw_index
  from published_draws
),
all_numbers as (
  select lpad(value::text, 4, '0')::char(4) as winning_number
  from generate_series(0, 9999) value
)
select
  n.winning_number,
  coalesce(a.total_appearances, 0) as total_appearances,
  coalesce(a.first_count, 0) as first_count,
  coalesce(a.second_count, 0) as second_count,
  coalesce(a.third_count, 0) as third_count,
  coalesce(a.starter_count, 0) as starter_count,
  coalesce(a.consolation_count, 0) as consolation_count,
  a.last_appeared_at,
  case
    when a.last_draw_index is null then latest.latest_draw_index
    else latest.latest_draw_index - a.last_draw_index
  end::integer as current_gap,
  a.average_gap,
  a.longest_gap
from all_numbers n
cross join latest
left join aggregated a using (winning_number);

create unique index if not exists four_d_number_stats_number_idx
  on public.four_d_number_stats (winning_number);

create or replace view public.trending_numbers_24h as
select
  winning_number,
  count(*)::integer as searches,
  max(searched_at) as last_searched_at
from public.number_search_events
where searched_at >= now() - interval '24 hours'
group by winning_number
order by searches desc, last_searched_at desc;

create or replace view public.trending_numbers_7d as
select
  winning_number,
  count(*)::integer as searches,
  max(searched_at) as last_searched_at
from public.number_search_events
where searched_at >= now() - interval '7 days'
group by winning_number
order by searches desc, last_searched_at desc;

create or replace function public.refresh_lottery_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.four_d_number_stats;
end;
$$;

alter table public.number_search_events enable row level security;
alter table public.weekly_insight_subscribers enable row level security;

-- Public clients may record a searched number, but cannot read raw event records.
create policy "Public can record number searches"
on public.number_search_events
for insert
to anon, authenticated
with check (true);

-- Aggregated statistics are safe for public display.
grant select on public.four_d_number_stats to anon, authenticated;
grant select on public.trending_numbers_24h to anon, authenticated;
grant select on public.trending_numbers_7d to anon, authenticated;

-- Subscriber writes should go through a server-side route using the service role.
-- No public select policy is intentionally created for subscriber data.
