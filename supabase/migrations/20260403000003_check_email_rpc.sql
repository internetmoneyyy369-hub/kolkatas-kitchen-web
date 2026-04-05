-- ─────────────────────────────────────────────
-- RPC: Check Email Exist
-- ─────────────────────────────────────────────
create or replace function public.check_email_exists(lookup_email text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1 from auth.users where email = lookup_email
  ) into v_exists;
  
  return v_exists;
end;
$$;
