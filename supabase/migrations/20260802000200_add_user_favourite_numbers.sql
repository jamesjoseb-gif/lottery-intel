-- Apply separately through the normal Supabase migration process. This migration does not alter result data.
create table public.user_favourite_numbers (
  user_id uuid not null references auth.users(id) on delete cascade,
  number text not null check (number ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, number)
);

create index user_favourite_numbers_created_at_idx
  on public.user_favourite_numbers (user_id, created_at desc);

alter table public.user_favourite_numbers enable row level security;
alter table public.user_favourite_numbers force row level security;

create policy favourite_numbers_select_own on public.user_favourite_numbers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy favourite_numbers_insert_own on public.user_favourite_numbers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy favourite_numbers_update_own on public.user_favourite_numbers
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy favourite_numbers_delete_own on public.user_favourite_numbers
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_favourite_numbers from anon;
grant select, insert, update, delete on public.user_favourite_numbers to authenticated;
