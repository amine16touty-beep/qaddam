-- ============================================================
-- QADDAM — business rules that must hold no matter which client writes
-- ============================================================

-- ---------- new user: profile + 5 default contexts ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare tz text := new.raw_user_meta_data ->> 'timezone';
begin
  if tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    tz := 'UTC';
  end if;
  insert into public.profiles (id, display_name, timezone)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), tz);

  insert into public.contexts (user_id, name, color, icon, position) values
    (new.id, 'شخصي',            'violet', 'user',          0),
    (new.id, 'مهني',            'blue',   'briefcase',     1),
    (new.id, 'تطوعي وطلابي',    'green',  'users',         2),
    (new.id, 'صناعة المحتوى',   'orange', 'clapperboard',  3),
    (new.id, 'التعلم والتطوير', 'rose',   'graduation-cap',4);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- timezone must be a real IANA zone
create or replace function public.check_timezone()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'INVALID_TIMEZONE' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger check_timezone before insert or update of timezone on public.profiles
  for each row execute function public.check_timezone();

-- ---------- tasks: derived fields & guards ----------

create or replace function public.tasks_before_write()
returns trigger language plpgsql as $$
declare cnt int;
begin
  -- completed_at follows status
  if new.status = 'done' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;

  -- a milestone implies its project
  if new.milestone_id is not null then
    select project_id into new.project_id from public.milestones
     where id = new.milestone_id and user_id = new.user_id;
  end if;

  -- inherit context from the project when none is chosen
  if new.context_id is null and new.project_id is not null then
    select context_id into new.context_id from public.projects
     where id = new.project_id and user_id = new.user_id;
  end if;

  -- at most 3 top priorities per day
  if new.priority_date is not null and new.deleted_at is null
     and (tg_op = 'INSERT' or old.priority_date is distinct from new.priority_date or old.deleted_at is not null) then
    select count(*) into cnt from public.tasks
     where user_id = new.user_id and priority_date = new.priority_date
       and deleted_at is null and id <> new.id;
    if cnt >= 3 then
      raise exception 'PRIORITY_LIMIT' using errcode = 'P0001', hint = 'max 3 priorities per day';
    end if;
  end if;
  return new;
end $$;

create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

create or replace function public.inherit_project_context()
returns trigger language plpgsql as $$
begin
  if new.context_id is null and new.project_id is not null then
    select context_id into new.context_id from public.projects
     where id = new.project_id and user_id = new.user_id;
  end if;
  return new;
end $$;

create trigger inherit_context before insert or update of project_id on public.meetings
  for each row execute function public.inherit_project_context();
create trigger inherit_context before insert or update of project_id on public.notes
  for each row execute function public.inherit_project_context();

-- ---------- activity log + project "last activity" ----------

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  old_rec jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  act text;
  proj uuid;
  ttl text;
begin
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
      -- skip noise: position-only / timestamp-only updates
      if (old_rec - 'updated_at' - 'position' - 'last_activity_at' - 'search_text')
         = (rec - 'updated_at' - 'position' - 'last_activity_at' - 'search_text') then
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

  if proj is not null and tg_table_name <> 'projects' then
    update public.projects set last_activity_at = now() where id = proj;
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['projects','milestones','meetings','tasks','habits','notes','programs','goals']
  loop
    execute format('create trigger log_activity after insert or update or delete on public.%I
                    for each row execute function public.log_activity()', t);
  end loop;
end $$;

-- projects: touching the project itself refreshes last_activity_at
create or replace function public.touch_project()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(new) - 'updated_at' - 'last_activity_at') <> (to_jsonb(old) - 'updated_at' - 'last_activity_at') then
    new.last_activity_at := now();
  end if;
  return new;
end $$;
create trigger touch_project before update on public.projects
  for each row execute function public.touch_project();

-- ---------- decision → task (idempotent, keeps its source) ----------

create or replace function public.convert_decision_to_task(p_decision_id uuid)
returns public.tasks
language plpgsql security invoker set search_path = '' as $$
declare
  d public.decisions;
  m public.meetings;
  result public.tasks;
  is_mine boolean;
begin
  select * into d from public.decisions where id = p_decision_id;   -- RLS: only own rows visible
  if not found then
    raise exception 'DECISION_NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into m from public.meetings where id = d.meeting_id;

  is_mine := d.owner_text is null or trim(d.owner_text) in ('', 'أنا', 'انا', 'me', 'Me');

  insert into public.tasks (user_id, title, kind, due_date, owner_text, project_id, context_id, meeting_id, decision_id)
  values (
    d.user_id,
    left(coalesce(nullif(trim(d.action), ''), d.text), 300),
    case when is_mine then 'task' else 'follow_up' end,
    d.due_date,
    case when is_mine then null else trim(d.owner_text) end,
    m.project_id,
    m.context_id,
    m.id,
    d.id
  )
  on conflict (decision_id) where decision_id is not null do nothing
  returning * into result;

  if result.id is null then         -- already converted: return the existing task
    select * into result from public.tasks where decision_id = p_decision_id;
  end if;
  return result;
end $$;

-- ---------- unified search ----------

create or replace function public.search_all(q text, max_per_kind int default 6)
returns table (kind text, id uuid, title text, subtitle text, at timestamptz, score real)
language sql stable security invoker set search_path = public, extensions as $$
  with nq as (select public.normalize_search(trim(q)) as v)
  (select 'project', p.id, p.name, p.status, p.updated_at,
          greatest(similarity(p.search_text, nq.v), word_similarity(nq.v, p.search_text))
     from projects p, nq
    where p.deleted_at is null and (p.search_text like '%' || nq.v || '%' or nq.v <% p.search_text)
    order by 6 desc, 5 desc limit max_per_kind)
  union all
  (select 'task', t.id, t.title, t.status, coalesce(t.due_date::timestamptz, t.updated_at),
          greatest(similarity(t.search_text, nq.v), word_similarity(nq.v, t.search_text))
     from tasks t, nq
    where t.deleted_at is null and (t.search_text like '%' || nq.v || '%' or nq.v <% t.search_text)
    order by 6 desc, 5 desc limit max_per_kind)
  union all
  (select 'meeting', m.id, m.title, null, m.starts_at,
          greatest(similarity(m.search_text, nq.v), word_similarity(nq.v, m.search_text))
     from meetings m, nq
    where m.deleted_at is null and (m.search_text like '%' || nq.v || '%' or nq.v <% m.search_text)
    order by 6 desc, 5 desc limit max_per_kind)
  union all
  (select 'decision', d.id, d.text, d.meeting_id::text, d.created_at,
          greatest(similarity(d.search_text, nq.v), word_similarity(nq.v, d.search_text))
     from decisions d join meetings m on m.id = d.meeting_id and m.deleted_at is null, nq
    where d.search_text like '%' || nq.v || '%' or nq.v <% d.search_text
    order by 6 desc, 5 desc limit max_per_kind)
  union all
  (select 'note', n.id, coalesce(nullif(n.title, ''), left(n.body, 80)), n.kind, n.updated_at,
          greatest(similarity(n.search_text, nq.v), word_similarity(nq.v, n.search_text))
     from notes n, nq
    where n.deleted_at is null and (n.search_text like '%' || nq.v || '%' or nq.v <% n.search_text)
    order by 6 desc, 5 desc limit max_per_kind)
$$;

grant execute on function public.convert_decision_to_task(uuid) to authenticated;
grant execute on function public.search_all(text, int) to authenticated;
revoke execute on function public.convert_decision_to_task(uuid) from anon, public;
revoke execute on function public.search_all(text, int) from anon, public;
