create extension if not exists pgcrypto;

create type public.game_type as enum ('4d', 'toto', 'sweep');
create type public.result_status as enum ('pending', 'validated', 'published', 'rejected');

create table public.draws (
  id uuid primary key default gen_random_uuid(),
  game public.game_type not null,
  draw_no text not null,
  draw_date timestamptz not null,
  status public.result_status not null default 'pending',
  source_url text,
  source_published_at timestamptz,
  next_draw_at timestamptz,
  next_advertised_prize numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game, draw_no)
);

create table public.four_d_results (
  id bigint generated always as identity primary key,
  draw_id uuid not null references public.draws(id) on delete cascade,
  prize_type text not null check (prize_type in ('first','second','third','starter','consolation')),
  winning_number char(4) not null check (winning_number ~ '^[0-9]{4}$'),
  position smallint,
  created_at timestamptz not null default now(),
  unique (draw_id, prize_type, position),
  check (
    (prize_type in ('first','second','third') and position is null)
    or (prize_type in ('starter','consolation') and position between 1 and 10)
  )
);

create index four_d_number_idx on public.four_d_results (winning_number);
create index four_d_draw_idx on public.four_d_results (draw_id);

create table public.toto_results (
  id bigint generated always as identity primary key,
  draw_id uuid not null references public.draws(id) on delete cascade,
  winning_number smallint not null check (winning_number between 1 and 49),
  position smallint not null check (position between 1 and 7),
  is_additional boolean not null default false,
  unique (draw_id, position),
  unique (draw_id, winning_number)
);

create table public.sweep_results (
  id bigint generated always as identity primary key,
  draw_id uuid not null references public.draws(id) on delete cascade,
  prize_name text not null,
  winning_number text not null,
  position integer,
  unique (draw_id, prize_name, winning_number)
);

create table public.import_logs (
  id uuid primary key default gen_random_uuid(),
  game public.game_type not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status public.result_status not null default 'pending',
  source_url text,
  records_found integer not null default 0,
  records_written integer not null default 0,
  checksum text,
  error_message text
);

alter table public.draws enable row level security;
alter table public.four_d_results enable row level security;
alter table public.toto_results enable row level security;
alter table public.sweep_results enable row level security;
alter table public.import_logs enable row level security;

create policy "Published draws are public" on public.draws for select using (status = 'published');
create policy "4D results are public for published draws" on public.four_d_results for select using (exists (select 1 from public.draws d where d.id = draw_id and d.status = 'published'));
create policy "TOTO results are public for published draws" on public.toto_results for select using (exists (select 1 from public.draws d where d.id = draw_id and d.status = 'published'));
create policy "Sweep results are public for published draws" on public.sweep_results for select using (exists (select 1 from public.draws d where d.id = draw_id and d.status = 'published'));
