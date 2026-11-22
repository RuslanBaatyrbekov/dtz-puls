-- DTZ-Puls: safety net for learner progress (run once in Supabase → SQL Editor).
-- 1) Every time a saved progress loses XP or finished days, the previous version is kept in progress_history.
-- 2) Every night at 03:00 a full snapshot of all progress is kept (14 days).
-- Restore one learner:  update progress set state = (select state from progress_history where id = <ID>), updated_at = now() where user_id = '<USER_ID>';

create table if not exists public.progress_history (
  id bigserial primary key,
  user_id uuid not null,
  state jsonb not null,
  reason text not null,
  saved_at timestamptz not null default now()
);
create index if not exists progress_history_user on public.progress_history (user_id, saved_at desc);
alter table public.progress_history enable row level security;  -- no policies: only the dashboard / SQL editor can read it

create or replace function public.progress_keep_old() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_xp int := coalesce((old.state->>'xp')::numeric, 0);
  new_xp int := coalesce((new.state->>'xp')::numeric, 0);
  old_done int := (select count(*) from jsonb_object_keys(coalesce(old.state->'done', '{}'::jsonb)));
  new_done int := (select count(*) from jsonb_object_keys(coalesce(new.state->'done', '{}'::jsonb)));
begin
  if new_xp < old_xp or new_done < old_done then
    insert into progress_history (user_id, state, reason)
    values (old.user_id, old.state, format('before drop: xp %s→%s, days %s→%s', old_xp, new_xp, old_done, new_done));
  end if;
  return new;
end $$;

drop trigger if exists progress_keep_old on public.progress;
create trigger progress_keep_old before update on public.progress
  for each row execute function public.progress_keep_old();

-- nightly snapshot, keep 14 days
select cron.unschedule('dtz-snapshot') where exists (select 1 from cron.job where jobname = 'dtz-snapshot');
select cron.schedule('dtz-snapshot', '0 3 * * *', $$
  insert into public.progress_history (user_id, state, reason) select user_id, state, 'nightly' from public.progress;
  delete from public.progress_history where reason = 'nightly' and saved_at < now() - interval '14 days';
$$);
