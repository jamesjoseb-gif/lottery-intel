insert into public.games (code, name)
values
  ('4d', 'Singapore 4D'),
  ('toto', 'Singapore TOTO'),
  ('sweep', 'Singapore Sweep')
on conflict (code) do update set name = excluded.name;

-- Temporary, deterministic V1 fixture. `supabase db reset` loads a complete public
-- flow while the historical importer is being finished.
insert into public.game_rule_sets (id, game_code, version, effective_from, rules) values
  ('10000000-0000-0000-0000-000000000001', '4d', 1, '2020-01-01', '{"number_length":4}'),
  ('10000000-0000-0000-0000-000000000002', 'toto', 1, '2020-01-01', '{"min":1,"max":49}'),
  ('10000000-0000-0000-0000-000000000003', 'sweep', 1, '2020-01-01', '{"fixture":true}')
on conflict (id) do nothing;

insert into public.import_runs (id, mode, status, created_by, started_at, completed_at, summary) values
  ('20000000-0000-0000-0000-000000000001', 'backfill', 'completed', 'seed-fixture', now(), now(), '{"fixture":true}')
on conflict (id) do nothing;

insert into public.draws (id, game_code, draw_no, draw_date) values
  ('30000000-0000-0000-0000-000000000001', '4d', 'V1-4D-001', '2026-07-25'),
  ('30000000-0000-0000-0000-000000000002', 'toto', 'V1-TOTO-001', '2026-07-23'),
  ('30000000-0000-0000-0000-000000000003', 'sweep', 'V1-SWEEP-001', '2026-07-01')
on conflict (id) do nothing;

insert into public.draw_revisions (id, draw_id, revision_no, rule_set_id, status, normalized_checksum, parser_name, parser_version, import_run_id, published_at, published_by, publication_note) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1, '10000000-0000-0000-0000-000000000001', 'published', repeat('1',64), 'seed-fixture', '1', '20000000-0000-0000-0000-000000000001', now(), 'seed-fixture', 'Temporary V1 test data'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 1, '10000000-0000-0000-0000-000000000002', 'published', repeat('2',64), 'seed-fixture', '1', '20000000-0000-0000-0000-000000000001', now(), 'seed-fixture', 'Temporary V1 test data'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 1, '10000000-0000-0000-0000-000000000003', 'published', repeat('3',64), 'seed-fixture', '1', '20000000-0000-0000-0000-000000000001', now(), 'seed-fixture', 'Temporary V1 test data')
on conflict (id) do nothing;

update public.draws set current_published_revision_id = case game_code
  when '4d' then '40000000-0000-0000-0000-000000000001'::uuid
  when 'toto' then '40000000-0000-0000-0000-000000000002'::uuid
  else '40000000-0000-0000-0000-000000000003'::uuid end
where id in ('30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003');

insert into public.fourd_results (revision_id, prize_type, position, winning_number)
select '40000000-0000-0000-0000-000000000001', prize_type, position, winning_number from (values
 ('first',1,'1234'),('second',1,'5678'),('third',1,'9012'),
 ('starter',1,'0034'),('starter',2,'1122'),('starter',3,'2345'),('starter',4,'3456'),('starter',5,'4567'),('starter',6,'6789'),('starter',7,'7890'),('starter',8,'8012'),('starter',9,'8888'),('starter',10,'9999'),
 ('consolation',1,'0001'),('consolation',2,'1010'),('consolation',3,'2026'),('consolation',4,'3141'),('consolation',5,'4321'),('consolation',6,'5432'),('consolation',7,'6543'),('consolation',8,'7654'),('consolation',9,'8765'),('consolation',10,'9876')
) as fixture(prize_type, position, winning_number) on conflict do nothing;

insert into public.toto_results (revision_id, number_kind, position, winning_number) values
 ('40000000-0000-0000-0000-000000000002','main',1,3),('40000000-0000-0000-0000-000000000002','main',2,11),('40000000-0000-0000-0000-000000000002','main',3,18),('40000000-0000-0000-0000-000000000002','main',4,27),('40000000-0000-0000-0000-000000000002','main',5,36),('40000000-0000-0000-0000-000000000002','main',6,45),('40000000-0000-0000-0000-000000000002','additional',1,49)
on conflict do nothing;

insert into public.sweep_results (revision_id, tier_code, source_label, position, ticket_number, source_display_value) values
 ('40000000-0000-0000-0000-000000000003','first','First Prize',1,'1234567','1234567'),
 ('40000000-0000-0000-0000-000000000003','second','Second Prize',1,'2345678','2345678'),
 ('40000000-0000-0000-0000-000000000003','third','Third Prize',1,'3456789','3456789')
on conflict do nothing;
