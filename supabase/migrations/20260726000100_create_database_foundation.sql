create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.games (
  code text primary key check (code in ('4d', 'toto', 'sweep')),
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.game_rule_sets (
  id uuid primary key default extensions.gen_random_uuid(),
  game_code text not null references public.games(code) on update cascade,
  version integer not null check (version > 0),
  effective_from date not null,
  effective_to date,
  rules jsonb not null check (jsonb_typeof(rules) = 'object'),
  effective_period daterange generated always as
    (daterange(effective_from, effective_to, '[)')) stored,
  created_at timestamptz not null default now(),
  unique (game_code, version),
  check (effective_to is null or effective_to > effective_from),
  exclude using gist (game_code with =, effective_period with &&)
);

create table public.import_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  mode text not null check (mode in ('backfill', 'latest', 'repair', 'revalidate')),
  game_code text references public.games(code) on update cascade,
  requested_from date,
  requested_to date,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'completed_with_review', 'failed', 'cancelled')),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  sampling_seed text,
  sampling_algorithm_version text,
  started_at timestamptz,
  completed_at timestamptz,
  heartbeat_at timestamptz,
  created_by text not null,
  deployment_id text,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  created_at timestamptz not null default now(),
  check (requested_to is null or requested_from is null or requested_to >= requested_from),
  check ((sampling_seed is null) = (sampling_algorithm_version is null)),
  check (completed_at is null or started_at is not null),
  check (completed_at is null or completed_at >= started_at)
);

create index import_runs_status_created_idx on public.import_runs (status, created_at);
create index import_runs_game_started_idx on public.import_runs (game_code, started_at desc);

create table public.draws (
  id uuid primary key default extensions.gen_random_uuid(),
  game_code text not null references public.games(code) on update cascade,
  draw_no text not null check (btrim(draw_no) <> ''),
  draw_date date not null,
  drawn_at timestamptz,
  current_published_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_code, draw_no)
);

create index draws_archive_idx
  on public.draws (game_code, draw_date desc, draw_no desc, id desc);

create table public.draw_revisions (
  id uuid primary key default extensions.gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete restrict,
  revision_no integer not null check (revision_no > 0),
  rule_set_id uuid not null references public.game_rule_sets(id) on delete restrict,
  status text not null default 'staged'
    check (status in ('staged', 'validating', 'quarantined', 'eligible', 'published', 'superseded', 'rejected')),
  normalized_checksum text not null check (normalized_checksum ~ '^[0-9a-f]{64}$'),
  parser_name text not null check (btrim(parser_name) <> ''),
  parser_version text not null check (btrim(parser_version) <> ''),
  import_run_id uuid not null references public.import_runs(id) on delete restrict,
  supersedes_revision_id uuid references public.draw_revisions(id) on delete restrict,
  publication_note text,
  published_at timestamptz,
  published_by text,
  created_at timestamptz not null default now(),
  unique (draw_id, revision_no),
  unique (draw_id, normalized_checksum),
  check (supersedes_revision_id is null or supersedes_revision_id <> id),
  check ((published_at is null) = (published_by is null)),
  check ((status in ('published', 'superseded')) = (published_at is not null))
);

alter table public.draws
  add constraint draws_current_revision_fk
  foreign key (current_published_revision_id) references public.draw_revisions(id)
  on delete restrict deferrable initially deferred;

create unique index draw_revisions_one_published_idx
  on public.draw_revisions (draw_id) where status = 'published';
create index draw_revisions_status_created_idx on public.draw_revisions (status, created_at);
create index draw_revisions_import_run_idx on public.draw_revisions (import_run_id);
create index draw_revisions_supersedes_idx on public.draw_revisions (supersedes_revision_id)
  where supersedes_revision_id is not null;

create table public.fourd_results (
  revision_id uuid not null references public.draw_revisions(id) on delete restrict,
  prize_type text not null check (prize_type in ('first', 'second', 'third', 'starter', 'consolation')),
  position smallint not null,
  winning_number text not null check (winning_number ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  primary key (revision_id, prize_type, position),
  unique (revision_id, winning_number),
  check (
    (prize_type in ('first', 'second', 'third') and position = 1)
    or (prize_type in ('starter', 'consolation') and position between 1 and 10)
  )
);

create index fourd_results_number_idx on public.fourd_results (winning_number, revision_id);

create table public.toto_results (
  revision_id uuid not null references public.draw_revisions(id) on delete restrict,
  number_kind text not null check (number_kind in ('main', 'additional')),
  position smallint not null,
  winning_number smallint not null check (winning_number > 0),
  created_at timestamptz not null default now(),
  primary key (revision_id, number_kind, position),
  unique (revision_id, winning_number),
  check (
    (number_kind = 'main' and position between 1 and 6)
    or (number_kind = 'additional' and position = 1)
  )
);

create index toto_results_number_idx on public.toto_results (winning_number, revision_id);

create table public.sweep_results (
  id uuid primary key default extensions.gen_random_uuid(),
  revision_id uuid not null references public.draw_revisions(id) on delete restrict,
  tier_code text not null check (btrim(tier_code) <> ''),
  source_label text not null check (btrim(source_label) <> ''),
  position integer not null check (position > 0),
  ticket_number text not null check (ticket_number ~ '^[0-9]+$'),
  series text,
  entry_suffix text,
  source_display_value text not null check (btrim(source_display_value) <> ''),
  created_at timestamptz not null default now(),
  unique (revision_id, tier_code, position)
);

create unique index sweep_results_entry_idx on public.sweep_results
  (revision_id, tier_code, ticket_number, coalesce(series, ''), coalesce(entry_suffix, ''));
create index sweep_results_revision_idx on public.sweep_results (revision_id, tier_code, position);

create table public.source_observations (
  id uuid primary key default extensions.gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete restrict,
  source_code text not null check (btrim(source_code) <> ''),
  independence_group text not null check (btrim(independence_group) <> ''),
  request_locator text not null check (btrim(request_locator) <> ''),
  retrieved_at timestamptz not null,
  http_status smallint check (http_status between 100 and 599),
  content_type text,
  artifact_storage_key text,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  byte_length bigint not null check (byte_length >= 0),
  adapter_name text not null,
  adapter_version text not null,
  parser_version text not null,
  normalized_payload jsonb,
  normalized_sha256 text check (normalized_sha256 ~ '^[0-9a-f]{64}$'),
  parse_status text not null check (parse_status in ('pending', 'parsed', 'failed')),
  parse_error_code text,
  created_at timestamptz not null default now(),
  unique (source_code, content_sha256, parser_version),
  check ((parse_status = 'failed') or parse_error_code is null)
);

create index source_observations_run_idx on public.source_observations (import_run_id, retrieved_at);

create table public.validation_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  revision_id uuid not null references public.draw_revisions(id) on delete restrict,
  import_run_id uuid not null references public.import_runs(id) on delete restrict,
  validation_type text not null
    check (validation_type in ('schema', 'cardinality', 'range', 'chronology', 'cross_source', 'manual')),
  validator_name text not null,
  validator_version text not null,
  status text not null default 'running' check (status in ('running', 'passed', 'failed', 'warning')),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= started_at)
);

create index validation_runs_revision_status_idx on public.validation_runs (revision_id, status);
create index validation_runs_import_status_idx on public.validation_runs (import_run_id, status);

create table public.manual_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  revision_id uuid not null references public.draw_revisions(id) on delete restrict,
  reason_code text not null check (btrim(reason_code) <> ''),
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved_accept', 'resolved_correct', 'resolved_reject')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null check (btrim(summary) <> ''),
  assigned_to text,
  resolution text,
  rationale text,
  opened_at timestamptz not null default now(),
  opened_by text not null,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  check ((resolved_at is null) = (resolved_by is null)),
  check ((status in ('open', 'investigating')) = (resolved_at is null))
);

create index manual_reviews_status_created_idx on public.manual_reviews (status, created_at);
create index manual_reviews_revision_idx on public.manual_reviews (revision_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('system', 'importer', 'reviewer', 'administrator')),
  actor_id text not null,
  action text not null check (btrim(action) <> ''),
  entity_type text not null check (btrim(entity_type) <> ''),
  entity_id text not null,
  import_run_id uuid references public.import_runs(id) on delete restrict,
  manual_review_id uuid references public.manual_reviews(id) on delete restrict,
  before_checksum text check (before_checksum ~ '^[0-9a-f]{64}$'),
  after_checksum text check (after_checksum ~ '^[0-9a-f]{64}$'),
  safe_diff jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_diff) = 'object'),
  reason text,
  correlation_id uuid not null default extensions.gen_random_uuid()
);

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, occurred_at desc);
create index audit_events_correlation_idx on public.audit_events (correlation_id);

create function public.check_draw_revision_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  revision_draw_id uuid;
  revision_status text;
begin
  if tg_table_name = 'draws' then
    if new.current_published_revision_id is null then
      return new;
    end if;

    select revision.draw_id, revision.status
      into revision_draw_id, revision_status
    from public.draw_revisions revision
    where revision.id = new.current_published_revision_id;

    if revision_draw_id is distinct from new.id or revision_status is distinct from 'published' then
      raise exception 'current revision must be a published revision belonging to this draw';
    end if;
  elsif exists (
    select 1 from public.draws draw
    where draw.current_published_revision_id = new.id
      and (new.draw_id <> draw.id or new.status <> 'published')
  ) then
    raise exception 'a current revision must remain published and belong to its draw';
  end if;

  return new;
end
$$;

create constraint trigger draws_revision_consistency
after insert or update of current_published_revision_id on public.draws
deferrable initially deferred
for each row execute function public.check_draw_revision_consistency();

create constraint trigger revisions_draw_consistency
after update of draw_id, status on public.draw_revisions
deferrable initially deferred
for each row execute function public.check_draw_revision_consistency();

create function public.check_revision_context()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  revision_game text;
  revision_date date;
  rules_game text;
  rules_period daterange;
  prior_draw_id uuid;
begin
  select draw.game_code, draw.draw_date into revision_game, revision_date
  from public.draws draw where draw.id = new.draw_id;

  select rules.game_code, rules.effective_period into rules_game, rules_period
  from public.game_rule_sets rules where rules.id = new.rule_set_id;

  if revision_game is distinct from rules_game or not rules_period @> revision_date then
    raise exception 'revision rule set must match the draw game and date';
  end if;

  if new.supersedes_revision_id is not null then
    select revision.draw_id into prior_draw_id
    from public.draw_revisions revision where revision.id = new.supersedes_revision_id;
    if prior_draw_id is distinct from new.draw_id then
      raise exception 'superseded revision must belong to the same draw';
    end if;
  end if;

  return new;
end
$$;

create constraint trigger revision_context_consistency
after insert or update of draw_id, rule_set_id, supersedes_revision_id on public.draw_revisions
deferrable initially deferred
for each row execute function public.check_revision_context();

revoke all on function public.check_draw_revision_consistency() from public;
revoke all on function public.check_revision_context() from public;
