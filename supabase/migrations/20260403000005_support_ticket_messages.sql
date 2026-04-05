-- ─────────────────────────────────────────────
-- SUPPORT TICKET MESSAGES
-- ─────────────────────────────────────────────
create table if not exists public.support_ticket_messages (
  id          uuid primary key default uuid_generate_v4(),
  ticket_id   uuid references public.support_tickets(id) on delete cascade not null,
  sender_id   uuid references public.profiles(id),
  sender_type text check (sender_type in ('user', 'admin')),
  content     text not null,
  is_read     boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index for performance
create index if not exists idx_support_ticket_messages_ticket_id on public.support_ticket_messages(ticket_id);

-- RLS
alter table public.support_ticket_messages enable row level security;

-- Policies
do $$ 
begin
  if not exists (select 1 from pg_policies where policyname = 'Users view own ticket messages') then
    create policy "Users view own ticket messages"
      on public.support_ticket_messages for select
      using (exists (select 1 from public.support_tickets t where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Users create own ticket messages') then
    create policy "Users create own ticket messages"
      on public.support_ticket_messages for insert
      with check (exists (select 1 from public.support_tickets t where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()));
  end if;
end $$;
