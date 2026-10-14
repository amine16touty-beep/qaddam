-- Reminders + Web Push

-- how early to remind before a meeting (0 = off) and whether timed tasks notify
alter table public.profiles
  add column remind_meetings_min smallint not null default 15 check (remind_meetings_min in (0, 5, 10, 15, 30, 60, 120)),
  add column remind_tasks boolean not null default true;

-- set once a reminder went out; cleared when the time moves so the new time reminds again
alter table public.meetings add column reminded_at timestamptz;
alter table public.tasks add column reminded_at timestamptz;

create or replace function public.meetings_reset_reminder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.starts_at is distinct from old.starts_at then new.reminded_at := null; end if;
  return new;
end $$;

create or replace function public.tasks_reset_reminder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.due_date is distinct from old.due_date or new.due_time is distinct from old.due_time then new.reminded_at := null; end if;
  return new;
end $$;

create trigger meetings_reset_reminder before update on public.meetings
  for each row execute function public.meetings_reset_reminder();
create trigger tasks_reset_reminder before update on public.tasks
  for each row execute function public.tasks_reset_reminder();

create index meetings_reminder_idx on public.meetings (starts_at) where reminded_at is null and deleted_at is null;
create index tasks_reminder_idx on public.tasks (due_date) where reminded_at is null and deleted_at is null and status = 'todo' and due_time is not null;

-- one row per device that allowed notifications
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  device text check (char_length(device) <= 120),
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- a reminder going out is not user activity
create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  old_rec jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  act text;
  proj uuid;
  ttl text;
begin
  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = (rec ->> 'user_id')::uuid) then
    return null;
  end if;

  if tg_op = 'INSERT' then
    act := 'created';
  elsif tg_op = 'DELETE' then
    act := 'deleted';
  else
    if rec ? 'deleted_at' and (old_rec ->> 'deleted_at') is null and (rec ->> 'deleted_at') is not null then
      act := 'deleted';
    elsif rec ? 'deleted_at' and (old_rec ->> 'deleted_at') is not null and (rec ->> 'deleted_at') is null then
      act := 'restored';
    elsif rec ? 'status' and (rec ->> 'status') = 'done' and (old_rec ->> 'status') <> 'done' then
      act := 'completed';
    elsif rec ? 'status' and (old_rec ->> 'status') = 'done' and (rec ->> 'status') <> 'done' then
      act := 'reopened';
    elsif tg_table_name = 'milestones' and (rec ->> 'completed_at') is not null and (old_rec ->> 'completed_at') is null then
      act := 'completed';
    elsif tg_table_name = 'milestones' and (rec ->> 'completed_at') is null and (old_rec ->> 'completed_at') is not null then
      act := 'reopened';
    else
      if (old_rec - 'updated_at' - 'position' - 'last_activity_at' - 'search_text' - 'reminded_at')
         = (rec - 'updated_at' - 'position' - 'last_activity_at' - 'search_text' - 'reminded_at') then
        return null;
      end if;
      act := 'updated';
    end if;
  end if;

  proj := case when tg_table_name = 'projects' then (rec ->> 'id')::uuid
               else nullif(rec ->> 'project_id', '')::uuid end;
  ttl := coalesce(rec ->> 'title', rec ->> 'name', rec ->> 'text');

  if tg_table_name = 'tasks' and tg_op = 'INSERT' and (rec ->> 'decision_id') is not null then
    act := 'converted';
  end if;

  insert into public.activity_logs (user_id, entity_type, entity_id, action, title, project_id)
  values ((rec ->> 'user_id')::uuid, tg_table_name, (rec ->> 'id')::uuid, act, left(ttl, 200), proj);

  if proj is not null and tg_table_name <> 'projects' and tg_op <> 'DELETE' then
    update public.projects set last_activity_at = now() where id = proj;
  end if;
  return null;
end $$;
