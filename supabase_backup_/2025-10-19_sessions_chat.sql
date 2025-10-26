-- Session, participant, and chat messaging schema for AskAutoDoctor
create extension if not exists "pgcrypto";

create type if not exists public.session_type as enum ('chat', 'video', 'diagnostic');
create type if not exists public.session_participant_role as enum ('customer', 'mechanic');

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  plan text not null,
  type public.session_type not null,
  status text default 'pending',
  stripe_session_id text not null unique,
  intake_id uuid references public.intakes (id) on delete set null,
  customer_user_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.session_participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.session_participant_role not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (session_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content text not null,
  attachments jsonb not null default '[]'::jsonb
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_updated_at on public.sessions;
create trigger sessions_updated_at
  before update on public.sessions
  for each row
  execute function public.set_current_timestamp_updated_at();

create index if not exists sessions_stripe_session_idx on public.sessions (stripe_session_id);
create index if not exists sessions_type_idx on public.sessions (type);
create index if not exists session_participants_session_idx on public.session_participants (session_id);
create index if not exists session_participants_user_idx on public.session_participants (user_id);
create index if not exists chat_messages_session_created_idx on public.chat_messages (session_id, created_at);

alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sessions' and policyname = 'Participants can read their sessions'
  ) then
    create policy "Participants can read their sessions"
      on public.sessions
      for select
      using (
        exists (
          select 1
          from public.session_participants sp
          where sp.session_id = id
            and sp.user_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_participants' and policyname = 'Participants can read participants'
  ) then
    create policy "Participants can read participants"
      on public.session_participants
      for select
      using (
        exists (
          select 1
          from public.session_participants sp
          where sp.session_id = session_id
            and sp.user_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Participants can read messages'
  ) then
    create policy "Participants can read messages"
      on public.chat_messages
      for select
      using (
        exists (
          select 1
          from public.session_participants sp
          where sp.session_id = session_id
            and sp.user_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_messages' and policyname = 'Participants can send messages'
  ) then
    create policy "Participants can send messages"
      on public.chat_messages
      for insert
      with check (
        exists (
          select 1
          from public.session_participants sp
          where sp.session_id = session_id
            and sp.user_id = auth.uid()
        )
        and sender_id = auth.uid()
      );
  end if;
end
$$;
