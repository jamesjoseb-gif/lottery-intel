-- Official Singapore 4D results can repeat the same four-digit number across
-- different prize categories. Keep structural validation, but do not require
-- all 23 winning_number values to be distinct.
create or replace function public.import_fourd_v1_draw(
  p_import_run_id uuid,
  p_draw_no text,
  p_draw_date date,
  p_source_url text,
  p_checksum text,
  p_results jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draw_id uuid;
  v_revision_id uuid;
  v_current_checksum text;
  v_rule_set_id uuid;
begin
  if p_draw_no is null or btrim(p_draw_no) = '' then
    raise exception 'draw number is required';
  end if;

  if p_draw_date < (current_date - interval '2 years')::date or p_draw_date > current_date then
    raise exception 'draw date is outside the two-year import window';
  end if;

  if p_checksum !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid checksum';
  end if;

  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) <> 23 then
    raise exception 'a 4D result must contain exactly 23 numbers';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_results)
      as r(prize_type text, position smallint, winning_number text)
    where r.prize_type not in ('first','second','third','starter','consolation')
       or r.position is null
       or r.position < 1
       or r.winning_number !~ '^[0-9]{4}$'
  )
  or (select count(*) from jsonb_to_recordset(p_results) as r(prize_type text) where prize_type = 'first') <> 1
  or (select count(*) from jsonb_to_recordset(p_results) as r(prize_type text) where prize_type = 'second') <> 1
  or (select count(*) from jsonb_to_recordset(p_results) as r(prize_type text) where prize_type = 'third') <> 1
  or (select count(*) from jsonb_to_recordset(p_results) as r(prize_type text) where prize_type = 'starter') <> 10
  or (select count(*) from jsonb_to_recordset(p_results) as r(prize_type text) where prize_type = 'consolation') <> 10 then
    raise exception 'invalid 4D result structure';
  end if;

  select id into v_rule_set_id
  from public.game_rule_sets
  where game_code = '4d'
    and effective_period @> p_draw_date
  order by version desc
  limit 1;

  if v_rule_set_id is null then
    raise exception 'no 4D rule set covers draw date';
  end if;

  insert into public.draws (game_code, draw_no, draw_date)
  values ('4d', btrim(p_draw_no), p_draw_date)
  on conflict (game_code, draw_no) do update set draw_no = excluded.draw_no
  returning id into v_draw_id;

  select revision.normalized_checksum into v_current_checksum
  from public.draws draw
  join public.draw_revisions revision
    on revision.id = draw.current_published_revision_id
  where draw.id = v_draw_id
  for update of draw;

  if v_current_checksum is not null then
    if v_current_checksum = p_checksum then
      return false;
    end if;

    raise exception 'draw % is already published with different contents', p_draw_no;
  end if;

  insert into public.draw_revisions
    (draw_id, revision_no, rule_set_id, status, normalized_checksum, parser_name,
     parser_version, import_run_id, publication_note)
  values
    (v_draw_id, 1, v_rule_set_id, 'eligible', p_checksum,
     'singapore-pools-4d-v1', '1', p_import_run_id, 'Singapore Pools V1 import')
  returning id into v_revision_id;

  insert into public.fourd_results
    (revision_id, prize_type, position, winning_number)
  select v_revision_id, r.prize_type, r.position, r.winning_number
  from jsonb_to_recordset(p_results)
    as r(prize_type text, position smallint, winning_number text);

  update public.draw_revisions
  set status = 'published',
      published_at = now(),
      published_by = 'fourd-v1-importer'
  where id = v_revision_id;

  update public.draws
  set current_published_revision_id = v_revision_id,
      updated_at = now()
  where id = v_draw_id;

  return true;
end
$$;

revoke all on function public.import_fourd_v1_draw(uuid,text,date,text,text,jsonb)
from public, anon, authenticated;

grant execute on function public.import_fourd_v1_draw(uuid,text,date,text,text,jsonb)
to service_role;
