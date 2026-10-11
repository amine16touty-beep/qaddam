-- Run: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/db_rules.sql
-- Everything runs inside a transaction that is rolled back.
begin;

insert into auth.users (id, email, raw_user_meta_data, instance_id, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"timezone":"Africa/Algiers","display_name":"A"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"timezone":"Not/AZone"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

-- signup trigger
do $$ begin
  assert (select timezone from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Africa/Algiers', 'tz kept';
  assert (select timezone from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'UTC', 'bad tz falls back';
  assert (select count(*) from contexts where user_id = '00000000-0000-0000-0000-00000000000a') = 5, '5 default contexts';
end $$;

-- act as user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

insert into projects (id, name, context_id)
select '10000000-0000-0000-0000-000000000001', 'مشروع الإستقطاب', id from contexts where name = 'مهني';
insert into meetings (id, title, starts_at, project_id)
values ('20000000-0000-0000-0000-000000000001', 'اجتماع اللجنة', now(), '10000000-0000-0000-0000-000000000001');
insert into decisions (id, meeting_id, text, action, owner_text, due_date) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'إعداد التقرير النهائي', 'تحضير التقرير', 'أنا', current_date + 4),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'حجز القاعة', null, 'سارة', current_date + 1);

do $$
declare t1 tasks; t2 tasks; t3 tasks; n int;
begin
  -- context inherited from project
  assert (select context_id from meetings where id = '20000000-0000-0000-0000-000000000001')
       = (select context_id from projects where id = '10000000-0000-0000-0000-000000000001'), 'meeting inherits context';

  t1 := convert_decision_to_task('30000000-0000-0000-0000-000000000001');
  t2 := convert_decision_to_task('30000000-0000-0000-0000-000000000001');
  assert t1.id = t2.id, 'converting twice returns the same task';
  select count(*) into n from tasks where decision_id = '30000000-0000-0000-0000-000000000001';
  assert n = 1, 'no duplicate task';
  assert t1.title = 'تحضير التقرير' and t1.kind = 'task' and t1.owner_text is null, 'my action becomes my task';
  assert t1.meeting_id = '20000000-0000-0000-0000-000000000001' and t1.project_id = '10000000-0000-0000-0000-000000000001', 'source kept';
  assert t1.context_id is not null, 'context carried';

  t3 := convert_decision_to_task('30000000-0000-0000-0000-000000000002');
  assert t3.kind = 'follow_up' and t3.owner_text = 'سارة' and t3.title = 'حجز القاعة', 'other owner => follow-up';

  -- completed_at follows status
  update tasks set status = 'done' where id = t1.id;
  assert (select completed_at from tasks where id = t1.id) is not null, 'completed_at set';
  update tasks set status = 'todo' where id = t1.id;
  assert (select completed_at from tasks where id = t1.id) is null, 'completed_at cleared';

  -- activity
  assert exists (select 1 from activity_logs where entity_id = t1.id and action = 'converted'), 'converted logged';
  assert exists (select 1 from activity_logs where entity_id = t1.id and action = 'completed'), 'completed logged';
  assert exists (select 1 from activity_logs where entity_id = t1.id and action = 'reopened'), 'reopened logged';

  -- search ignores hamza / taa marbuta differences
  assert exists (select 1 from search_all('الاستقطاب') where kind = 'project'), 'hamza-insensitive search';
  assert exists (select 1 from search_all('إجتماع') where kind = 'meeting'), 'search meeting';
  assert exists (select 1 from search_all('التقريره') where kind in ('task','decision')) or
         exists (select 1 from search_all('التقرير') where kind = 'task'), 'search task';
end $$;

-- priority limit
insert into tasks (title, priority_date) values ('p1', current_date), ('p2', current_date), ('p3', current_date);
do $$ begin
  begin
    insert into tasks (title, priority_date) values ('p4', current_date);
    assert false, '4th priority should fail';
  exception when raise_exception then
    assert sqlerrm = 'PRIORITY_LIMIT', 'priority error code';
  end;
end $$;

-- habits: frequency constraints & unique log per day
insert into habits (id, name, frequency_type, times_per_week) values ('40000000-0000-0000-0000-000000000001', 'الجيم', 'times_per_week', 4);
insert into habit_logs (habit_id, log_date) values ('40000000-0000-0000-0000-000000000001', current_date);
insert into habit_logs (habit_id, log_date, value) values ('40000000-0000-0000-0000-000000000001', current_date, 2)
  on conflict (habit_id, log_date) do update set value = excluded.value;
do $$ begin
  assert (select count(*) from habit_logs) = 1, 'one log per day';
  begin
    insert into habits (name, frequency_type, times_per_week) values ('bad', 'daily', 3);
    assert false, 'invalid frequency should fail';
  exception when check_violation then null;
  end;
end $$;

-- act as user B: sees nothing of A, cannot link to A's rows
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
do $$
declare n int;
begin
  select count(*) into n from projects;      assert n = 0, 'B sees no projects';
  select count(*) into n from tasks;         assert n = 0, 'B sees no tasks';
  select count(*) into n from decisions;     assert n = 0, 'B sees no decisions';
  select count(*) into n from activity_logs; assert n = 0, 'B sees no activity';
  select count(*) into n from search_all('اجتماع'); assert n = 0, 'B search empty';
  update projects set name = 'hacked'; -- silently affects 0 rows
  begin
    insert into tasks (title, project_id) values ('x', '10000000-0000-0000-0000-000000000001');
    assert false, 'B cannot link to A project';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into tasks (title, user_id) values ('x', '00000000-0000-0000-0000-00000000000a');
    assert false, 'B cannot write as A';
  exception when insufficient_privilege then null;
  end;
  begin
    perform convert_decision_to_task('30000000-0000-0000-0000-000000000001');
    assert false, 'B cannot convert A decision';
  exception when no_data_found then null;
  end;
end $$;

reset role;
do $$ begin
  assert (select name from projects where id = '10000000-0000-0000-0000-000000000001') = 'مشروع الإستقطاب', 'A data untouched';
end $$;

-- anon sees nothing
set local role anon;
do $$ begin
  begin
    perform 1 from tasks;
    assert false, 'anon must not read';
  exception when insufficient_privilege then null;
  end;
end $$;

-- deleting an account removes everything without tripping the activity trigger
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from tasks where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'cascade delete';
  assert (select count(*) from activity_logs where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'activity gone';
end $$;

rollback;
\echo 'DB RULES: ALL PASSED'
