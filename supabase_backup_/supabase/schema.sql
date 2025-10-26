create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  plan text not null,
  name text,
  email text,
  phone text,
  vin text,
  year text,
  make text,
  model text,
  odometer text,
  plate text,
  city text,
  concern text,
  files jsonb default '[]'::jsonb
);

alter table public.intakes enable row level security;
create policy "allow inserts from service role" on public.intakes for insert to public using (true) with check (true);
