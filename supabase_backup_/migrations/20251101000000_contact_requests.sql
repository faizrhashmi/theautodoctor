create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  name text not null,
  email text not null,
  reason text not null,
  subject text not null,
  message text not null,
  attachment_path text,
  attachment_url text,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb
);

alter table public.contact_requests
  alter column created_at set default timezone('utc', now());

alter table public.contact_requests enable row level security;

comment on table public.contact_requests is 'Inbound support requests submitted via the public contact form.';
comment on column public.contact_requests.attachment_path is 'Storage path for uploaded attachment files.';
comment on column public.contact_requests.attachment_url is 'Signed URL recorded at submission time for quick access.';

insert into storage.buckets (id, name, public)
values ('contact-uploads', 'contact-uploads', false)
on conflict (id) do nothing;

-- Allow the service role (used by server-side API routes) to manage uploads.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Service role manage contact uploads'
  ) then
    create policy "Service role manage contact uploads"
      on storage.objects
      for all
      using (bucket_id = 'contact-uploads')
      with check (bucket_id = 'contact-uploads');
  end if;
end $$;

-- (Optional) surface helper view for admins to query recent requests quickly.
create materialized view if not exists public.contact_request_summaries as
select
  id,
  created_at,
  name,
  email,
  reason,
  subject,
  status,
  (length(message) > 140) as has_long_message
from public.contact_requests
order by created_at desc;

create index if not exists contact_requests_created_at_idx
  on public.contact_requests (created_at desc);
