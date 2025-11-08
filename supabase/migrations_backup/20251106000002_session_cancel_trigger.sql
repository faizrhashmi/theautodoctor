-- Migration: Auto-fill cancel metadata when session status becomes 'cancelled'
-- Date: 2025-11-06
-- Purpose: Ensure cancelled_at and ended_at are always set when status = 'cancelled'

create or replace function set_cancel_meta()
returns trigger as $$
begin
  if NEW.status = 'cancelled' then
    if NEW.cancelled_at is null then NEW.cancelled_at := now(); end if;
    if NEW.ended_at is null then NEW.ended_at := now(); end if;
  end if;
  return NEW;
end; $$ language plpgsql;

drop trigger if exists trg_sessions_cancel_meta on public.sessions;
create trigger trg_sessions_cancel_meta
before update on public.sessions
for each row
when (OLD.status is distinct from NEW.status)
execute function set_cancel_meta();
