-- DTZ-Puls: push notifications for observers when a learner comes online or finishes a lesson.
-- Run once in Supabase → SQL Editor (safe to run again). Then deploy the notify-observers function.

-- What each observer wants to hear about (they switch it in the Observer tab).
create table if not exists public.observer_notify (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  online     boolean not null default false,
  lesson     boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.observer_notify enable row level security;
drop policy if exists "own notify prefs" on public.observer_notify;
create policy "own notify prefs" on public.observer_notify
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- When the last push went out (throttling). Only the Edge Function (service key) reads and writes it.
create table if not exists public.notify_log (
  learner uuid not null,
  kind    text not null,
  key     text not null default '',
  sent_at timestamptz not null default now(),
  primary key (learner, kind, key)
);
alter table public.notify_log enable row level security;
