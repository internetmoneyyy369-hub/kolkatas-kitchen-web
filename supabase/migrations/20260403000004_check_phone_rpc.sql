-- ─────────────────────────────────────────────
-- RPC: Check Phone Exist
-- ─────────────────────────────────────────────
create or replace function public.check_phone_exists(lookup_phone text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1 from public.profiles where phone = lookup_phone
  ) into v_exists;
  
  return v_exists;
end;
$$;
