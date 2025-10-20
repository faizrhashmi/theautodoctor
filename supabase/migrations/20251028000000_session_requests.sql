-- Session request broadcast + assignment schema
create extension if not exists "pgcrypto";

create type if not exists public.session_request_status as enum ('pending', 'accepted', 'cancelled');

create table if not exists public.session_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  mechanic_id uuid references auth.users(id) on delete set null,
  session_type public.session_type not null,
  plan_code text not null,
  status public.session_request_status not null default 'pending',
  customer_name text,
  customer_email text,
  notes text,
  accepted_at timestamptz,
  notification_sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists session_requests_status_idx on public.session_requests(status);
create index if not exists session_requests_created_idx on public.session_requests(created_at);

create or replace function public.touch_session_requests_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_session_requests_updated on public.session_requests;
create trigger trg_session_requests_updated
  before update on public.session_requests
  for each row execute function public.touch_session_requests_updated_at();

alter table public.session_requests enable row level security;

create policy if not exists "Customers can insert requests"
  on public.session_requests
  for insert
  with check (customer_id = auth.uid());

create policy if not exists "Customers can view their requests"
  on public.session_requests
  for select
  using (customer_id = auth.uid());

create policy if not exists "Mechanics can view pending requests"
  on public.session_requests
  for select
  using (
    status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'mechanic'
    )
  );

create policy if not exists "Mechanics can accept requests"
  on public.session_requests
  for update
  using (
    status = 'pending'
    and mechanic_id is null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'mechanic'
    )
  )
  with check (
    mechanic_id = auth.uid()
    and status = 'accepted'
  );

create policy if not exists "Customers can cancel pending requests"
  on public.session_requests
  for update
  using (customer_id = auth.uid())
  with check (
    customer_id = auth.uid()
    and mechanic_id is null
    and status in ('pending', 'cancelled')
  );
