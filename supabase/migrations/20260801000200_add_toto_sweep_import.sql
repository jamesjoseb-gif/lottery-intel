-- Validated, atomic and idempotent official TOTO / Singapore Sweep publication.
create or replace function public.import_toto_v1_draw(p_import_run_id uuid,p_draw_no text,p_draw_date date,p_source_url text,p_checksum text,p_results jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare v_draw uuid; v_revision uuid; v_current uuid; v_checksum text; v_rule uuid; v_no integer;
begin
 if btrim(coalesce(p_draw_no,''))='' or p_draw_date is null then raise exception 'draw identity is required'; end if;
 if p_checksum !~ '^[0-9a-f]{64}$' then raise exception 'invalid checksum'; end if;
 if jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<>7
 or (select count(*) from jsonb_to_recordset(p_results) r(number_kind text,position int,winning_number int) where number_kind='main')<>6
 or (select count(*) from jsonb_to_recordset(p_results) r(number_kind text,position int,winning_number int) where number_kind='additional')<>1
 or exists(select 1 from jsonb_to_recordset(p_results) r(number_kind text,position int,winning_number int) where winning_number not between 1 and 49 or (number_kind='main' and position not between 1 and 6) or (number_kind='additional' and position<>1))
 or (select count(distinct winning_number) from jsonb_to_recordset(p_results) r(number_kind text,position int,winning_number int))<>7
 or (select count(distinct position) from jsonb_to_recordset(p_results) r(number_kind text,position int,winning_number int) where number_kind='main')<>6 then raise exception 'invalid TOTO result structure'; end if;
 select id into v_rule from public.game_rule_sets where game_code='toto' and effective_period @> p_draw_date order by version desc limit 1; if v_rule is null then raise exception 'no TOTO rule set covers draw date'; end if;
 insert into public.draws(game_code,draw_no,draw_date) values('toto',btrim(p_draw_no),p_draw_date) on conflict(game_code,draw_no) do update set draw_date=excluded.draw_date returning id,current_published_revision_id into v_draw,v_current;
 if v_current is not null then select normalized_checksum into v_checksum from public.draw_revisions where id=v_current; if v_checksum=p_checksum then return false; end if; end if;
 select coalesce(max(revision_no),0)+1 into v_no from public.draw_revisions where draw_id=v_draw;
 insert into public.draw_revisions(draw_id,revision_no,rule_set_id,status,normalized_checksum,parser_name,parser_version,import_run_id,supersedes_revision_id,publication_note) values(v_draw,v_no,v_rule,'eligible',p_checksum,'singapore-pools-toto-v1','1',p_import_run_id,v_current,'Validated official Singapore Pools import') returning id into v_revision;
 insert into public.toto_results(revision_id,number_kind,position,winning_number) select v_revision,r.number_kind,r.position,r.winning_number from jsonb_to_recordset(p_results) r(number_kind text,position smallint,winning_number smallint);
 if v_current is not null then update public.draw_revisions set status='superseded' where id=v_current; end if;
 update public.draw_revisions set status='published',published_at=now(),published_by='toto-v1-importer' where id=v_revision; update public.draws set current_published_revision_id=v_revision,updated_at=now() where id=v_draw; return true;
end$$;
create or replace function public.import_sweep_v1_draw(p_import_run_id uuid,p_draw_no text,p_draw_date date,p_source_url text,p_checksum text,p_results jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare v_draw uuid; v_revision uuid; v_current uuid; v_checksum text; v_rule uuid; v_no integer;
begin
 if btrim(coalesce(p_draw_no,''))='' or p_draw_date is null then raise exception 'draw identity is required'; end if; if p_checksum !~ '^[0-9a-f]{64}$' then raise exception 'invalid checksum'; end if;
 if jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<3
 or exists(select 1 from jsonb_to_recordset(p_results) r(tier_code text,source_label text,position int,ticket_number text,source_display_value text) where btrim(coalesce(tier_code,''))='' or btrim(coalesce(source_label,''))='' or position<1 or ticket_number !~ '^[0-9]+$' or btrim(coalesce(source_display_value,''))='')
 or exists(select 1 from (select tier_code,position,count(*) n from jsonb_to_recordset(p_results) r(tier_code text,position int) group by tier_code,position having count(*)>1)x)
 or exists(select 1 from (values('first'),('second'),('third')) required(code) where not exists(select 1 from jsonb_to_recordset(p_results) r(tier_code text) where r.tier_code=required.code)) then raise exception 'invalid Sweep result structure'; end if;
 select id into v_rule from public.game_rule_sets where game_code='sweep' and effective_period @> p_draw_date order by version desc limit 1; if v_rule is null then raise exception 'no Sweep rule set covers draw date'; end if;
 insert into public.draws(game_code,draw_no,draw_date) values('sweep',btrim(p_draw_no),p_draw_date) on conflict(game_code,draw_no) do update set draw_date=excluded.draw_date returning id,current_published_revision_id into v_draw,v_current;
 if v_current is not null then select normalized_checksum into v_checksum from public.draw_revisions where id=v_current; if v_checksum=p_checksum then return false; end if; end if;
 select coalesce(max(revision_no),0)+1 into v_no from public.draw_revisions where draw_id=v_draw;
 insert into public.draw_revisions(draw_id,revision_no,rule_set_id,status,normalized_checksum,parser_name,parser_version,import_run_id,supersedes_revision_id,publication_note) values(v_draw,v_no,v_rule,'eligible',p_checksum,'singapore-pools-sweep-v1','1',p_import_run_id,v_current,'Validated official Singapore Pools import') returning id into v_revision;
 insert into public.sweep_results(revision_id,tier_code,source_label,position,ticket_number,series,entry_suffix,source_display_value) select v_revision,r.tier_code,r.source_label,r.position,r.ticket_number,r.series,r.entry_suffix,r.source_display_value from jsonb_to_recordset(p_results) r(tier_code text,source_label text,position int,ticket_number text,series text,entry_suffix text,source_display_value text);
 if v_current is not null then update public.draw_revisions set status='superseded' where id=v_current; end if;
 update public.draw_revisions set status='published',published_at=now(),published_by='sweep-v1-importer' where id=v_revision; update public.draws set current_published_revision_id=v_revision,updated_at=now() where id=v_draw; return true;
end$$;
revoke all on function public.import_toto_v1_draw(uuid,text,date,text,text,jsonb), public.import_sweep_v1_draw(uuid,text,date,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.import_toto_v1_draw(uuid,text,date,text,text,jsonb), public.import_sweep_v1_draw(uuid,text,date,text,text,jsonb) to service_role;
