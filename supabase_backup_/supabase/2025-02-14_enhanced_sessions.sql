-- Enhanced session management schema
-- Includes session metadata, extensions, shared files, waivers, and summaries.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  mechanic_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('scheduled', 'waiting', 'live', 'completed', 'cancelled')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  concern_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_customer_idx on public.sessions(customer_id);
create index if not exists sessions_mechanic_idx on public.sessions(mechanic_id);
create index if not exists sessions_status_idx on public.sessions(status);

create table if not exists public.session_extensions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  minutes integer not null check (minutes between 5 and 60),
  status text not null check (status in ('pending', 'approved', 'declined', 'paid')),
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists session_extensions_session_idx on public.session_extensions(session_id);

create table if not exists public.session_files (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  file_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_files_session_idx on public.session_files(session_id);

create table if not exists public.session_waivers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  accepted boolean not null default false,
  accepted_at timestamptz,
  signature text,
  ip_address inet,
  agreement_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create unique index if not exists session_waivers_session_customer_idx
  on public.session_waivers(session_id, customer_id);

create table if not exists public.session_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  mechanic_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  recommendations text,
  follow_up_actions text,
  created_at timestamptz not null default now()
);

create index if not exists session_summaries_session_idx on public.session_summaries(session_id);

create table if not exists public.mechanic_availability (
  id uuid primary key default gen_random_uuid(),
  mechanic_id uuid not null references auth.users(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists mechanic_availability_mechanic_idx on public.mechanic_availability(mechanic_id);

alter table public.sessions
  add column if not exists waiver_required boolean not null default true,
  add column if not exists room_code text,
  add column if not exists extension_balance integer not null default 0;

alter table public.sessions
  alter column updated_at set default now();

create or replace function public.touch_session_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_sessions_updated_at
  before update on public.sessions
  for each row execute function public.touch_session_updated_at();
