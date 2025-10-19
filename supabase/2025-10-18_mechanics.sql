create extension if not exists pgcrypto;

-- Mechanics table (email unique, password hashed)
create table if not exists public.mechanics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text unique not null,
  phone text,
  password_hash text not null
);

-- Sessions table (simple token -> mechanic)
create table if not exists public.mechanic_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  mechanic_id uuid not null references public.mechanics(id) on delete cascade,
  token text unique not null
);

alter table public.mechanics enable row level security;
alter table public.mechanic_sessions enable row level security;
-- Service role bypasses RLS. If you later want anon reads/writes, add policies.
