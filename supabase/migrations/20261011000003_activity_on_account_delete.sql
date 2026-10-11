-- Deleting an account cascades through every table. The activity trigger must
-- not try to log those deletions for a user who no longer exists.
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

  if proj is not null and tg_table_name <> 'projects' and tg_op <> 'DELETE' then
    update public.projects set last_activity_at = now() where id = proj;
  end if;
  return null;
end $$;
