insert into public.games (code, name)
values
  ('4d', 'Singapore 4D'),
  ('toto', 'Singapore TOTO'),
  ('sweep', 'Singapore Sweep')
on conflict (code) do update set name = excluded.name;
