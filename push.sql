-- DTZ-Puls: daily reminders (Web Push). Run once in Supabase → SQL Editor.
-- 1) where each device's push subscription is stored
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  hour       int  not null default 19 check (hour between 0 and 23),
  tz         text not null default 'Europe/Berlin',
  last_sent  date,
  updated_at timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subs(user_id);
alter table public.push_subs enable row level security;
drop policy if exists "own push subs select" on public.push_subs;
drop policy if exists "own push subs insert" on public.push_subs;
drop policy if exists "own push subs update" on public.push_subs;
drop policy if exists "own push subs delete" on public.push_subs;
create policy "own push subs select" on public.push_subs for select using (auth.uid() = user_id);
create policy "own push subs insert" on public.push_subs for insert with check (auth.uid() = user_id);
-- a phone can switch accounts: the new owner may take over the same endpoint
create policy "own push subs update" on public.push_subs for update using (true) with check (auth.uid() = user_id);
create policy "own push subs delete" on public.push_subs for delete using (auth.uid() = user_id);

-- 2) every 15 minutes call the send-reminders function
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('dtz-reminders') where exists (select 1 from cron.job where jobname = 'dtz-reminders');
select cron.schedule('dtz-reminders', '*/15 * * * *', $job$
  select net.http_post(
    url     := 'https://miidzagigpjlyjonbrxm.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'CRON_SECRET_HERE'),
    body    := '{}'::jsonb
  );
$job$);
