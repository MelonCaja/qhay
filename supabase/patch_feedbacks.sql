-- Parche: tabla feedbacks (PGRST205 — existe en schema.sql pero nunca se
-- aplicó al remoto; el apply del sprint seed fue anterior a este bloque).
-- Extracto idempotente de schema.sql — alineado con feedbackService.insert():
-- { user_id, email, rating, message, platform, app_version }

create table if not exists public.feedbacks (
  id           uuid primary key default gen_random_uuid(),
  -- nullable: conservar el feedback si la cuenta se elimina (on delete set null)
  user_id      uuid references auth.users (id) on delete set null,
  email        text,
  rating       integer not null check (rating between 1 and 5),
  message      text not null check (char_length(message) between 3 and 4000),
  app_version  text,
  platform     text,
  created_at   timestamptz not null default now()
);

alter table public.feedbacks enable row level security;

-- Solo INSERT del propio uid (más estricto que `with check (true)`: impide
-- insertar feedback a nombre de otro usuario). Sin SELECT desde el cliente;
-- se lee desde el dashboard con service_role.
drop policy if exists "feedbacks_insert_own" on public.feedbacks;
create policy "feedbacks_insert_own" on public.feedbacks
  for insert with check (auth.uid() = user_id);
