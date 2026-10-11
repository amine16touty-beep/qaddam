-- ============================================================
-- QADDAM — core schema
-- Every row belongs to one user (user_id = auth.uid()) and is protected by RLS.
-- Composite foreign keys (x_id, user_id) make cross-user links impossible.
-- ============================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- helpers ----------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Arabic-aware normalisation for search: strips tashkeel/tatweel,
-- unifies alef/hamza forms, taa marbuta and alef maqsura, lowercases Latin.
create or replace function public.normalize_search(t text)
returns text language sql immutable parallel safe as $$
  select lower(
    translate(
      regexp_replace(coalesce(t, ''), '[ً-ٰٟـ]', '', 'g'),
      'أإآٱةىؤئ',
      'اااااهيوي'
    )
  )
$$;

-- ---------- profiles ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  timezone text not null default 'UTC',
  locale text not null default 'ar' check (locale in ('ar', 'en')),
  week_start smallint not null default 1 check (week_start between 0 and 6),
  numerals text not null default 'latn' check (numerals in ('latn', 'arab')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- contexts ----------

create table public.contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default 'violet',
  icon text not null default 'circle',
  position int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

-- ---------- goals ----------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  context_id uuid,
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  foreign key (context_id, user_id) references public.contexts (id, user_id) on delete set null (context_id)
);

-- ---------- programs ----------

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  context_id uuid,
  goal_id uuid,
  status text not null default 'active' check (status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  start_date date,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  check (target_date is null or start_date is null or target_date >= start_date),
  foreign key (context_id, user_id) references public.contexts (id, user_id) on delete set null (context_id),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete set null (goal_id)
);

-- ---------- projects ----------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text,
  objective text,
  context_id uuid,
  program_id uuid,
  goal_id uuid,
  status text not null default 'active' check (status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  start_date date,
  target_date date,
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_text text generated always as (public.normalize_search(name || ' ' || coalesce(description, ''))) stored,
  unique (id, user_id),
  check (target_date is null or start_date is null or target_date >= start_date),
  foreign key (context_id, user_id) references public.contexts (id, user_id) on delete set null (context_id),
  foreign key (program_id, user_id) references public.programs (id, user_id) on delete set null (program_id),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete set null (goal_id)
);

-- ---------- milestones ----------

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(title) between 1 and 200),
  due_date date,
  completed_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade
);

-- ---------- meetings ----------

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  url text,
  project_id uuid,
  context_id uuid,
  participants text[] not null default '{}',
  agenda text not null default '',
  notes text not null default '',
  external_source text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_text text generated always as (public.normalize_search(title || ' ' || agenda || ' ' || notes)) stored,
  unique (id, user_id),
  check (ends_at is null or ends_at >= starts_at),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id),
  foreign key (context_id, user_id) references public.contexts (id, user_id) on delete set null (context_id)
);

-- ---------- decisions ----------
-- Follow-up status is NOT stored here: it is read from the linked task.

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meeting_id uuid not null,
  text text not null check (char_length(text) between 1 and 1000),
  action text,
  owner_text text,
  due_date date,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (public.normalize_search(text || ' ' || coalesce(action, ''))) stored,
  unique (id, user_id),
  foreign key (meeting_id, user_id) references public.meetings (id, user_id) on delete cascade
);

-- ---------- tasks (one table for tasks, meeting actions and follow-ups) ----------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  notes text,
  kind text not null default 'task' check (kind in ('task', 'follow_up')),
  status text not null default 'todo' check (status in ('todo', 'done', 'cancelled')),
  priority text not null default 'none' check (priority in ('none', 'low', 'medium', 'high')),
  due_date date,
  due_time time,
  priority_date date,              -- the day this task is one of the "top 3"
  owner_text text,                 -- null = me
  context_id uuid,
  project_id uuid,
  milestone_id uuid,
  meeting_id uuid,
  decision_id uuid,
  position double precision not null default extract(epoch from now()),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_text text generated always as (public.normalize_search(title || ' ' || coalesce(notes, '') || ' ' || coalesce(owner_text, ''))) stored,
  unique (id, user_id),
  check ((status = 'done') = (completed_at is not null)),
  foreign key (context_id, user_id) references public.contexts (id, user_id) on delete set null (context_id),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id),
  foreign key (milestone_id, user_id) references public.milestones (id, user_id) on delete set null (milestone_id),
  foreign key (meeting_id, user_id) references public.meetings (id, user_id) on delete set null (meeting_id),
  foreign key (decision_id, user_id) references public.decisions (id, user_id) on delete set null (decision_id)
);

-- A decision can produce at most one task — converting twice is impossible.
create unique index tasks_decision_unique on public.tasks (decision_id) where decision_id is not null;

-- ---------- habits ----------

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  context_id uuid,
  goal_id uuid,
  frequency_type text not null default 'daily' check (frequency_type in ('daily', 'weekdays', 'times_per_week')),
  weekdays smallint[],             -- 0 = Sunday … 6 = Saturday
  times_per_week smallint,
  target_value numeric check (target_value is null or target_value > 0),
  target_unit text,
  preferred_time time,
  start_date date not null default current_date,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  check (
    (frequency_type = 'daily' and weekdays is null and times_per_week is null)
    or (frequency_type = 'weekdays' and cardinality(weekdays) between 1 and 7
        and weekdays <@ array[0,1,2,3,4,5,6]::smallint[] and times_per_week is null)
    or (frequency_type = 'times_per_week' and times_per_week between 1 and 7 and weekdays is null)
  ),
  foreign key (context_id, user_id) references public.contexts (id, user_id) on delete set null (context_id),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete set null (goal_id)
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null,
  log_date date not null,
  value numeric not null default 1 check (value >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date),   -- a double tap upserts, never duplicates
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

-- ---------- notes & ideas ----------

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'idea')),
  title text,
  body text not null default '',
  project_id uuid,
  meeting_id uuid,
  context_id uuid,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search_text text generated always as (public.normalize_search(coalesce(title, '') || ' ' || body)) stored,
  unique (id, user_id),
  check (char_length(coalesce(title, '') || body) > 0),
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete set null (project_id),
  foreign key (meeting_id, user_id) references public.meetings (id, user_id) on delete set null (meeting_id),
  foreign key (context_id, user_id) references public.contexts (id, user_id) on delete set null (context_id)
);

-- ---------- weekly reviews ----------

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  focus text[] not null default '{}' check (cardinality(focus) <= 3),
  reflection text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------- activity log (written by triggers only) ----------

create table public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('created', 'updated', 'completed', 'reopened', 'deleted', 'restored', 'converted')),
  title text,
  project_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------

create index on public.tasks (user_id, status, due_date) where deleted_at is null;
create index on public.tasks (user_id, priority_date) where priority_date is not null;
create index on public.tasks (project_id) where project_id is not null;
create index on public.tasks (meeting_id) where meeting_id is not null;
create index on public.tasks (user_id, completed_at) where completed_at is not null;
create index on public.projects (user_id, status) where deleted_at is null;
create index on public.milestones (project_id);
create index on public.meetings (user_id, starts_at) where deleted_at is null;
create index on public.decisions (meeting_id);
create index on public.habit_logs (user_id, log_date);
create index on public.notes (user_id, created_at) where deleted_at is null;
create index on public.activity_logs (user_id, created_at desc);
create index on public.activity_logs (project_id, created_at desc) where project_id is not null;
create index tasks_search on public.tasks using gin (search_text extensions.gin_trgm_ops);
create index projects_search on public.projects using gin (search_text extensions.gin_trgm_ops);
create index meetings_search on public.meetings using gin (search_text extensions.gin_trgm_ops);
create index decisions_search on public.decisions using gin (search_text extensions.gin_trgm_ops);
create index notes_search on public.notes using gin (search_text extensions.gin_trgm_ops);

-- ---------- updated_at triggers ----------

do $$
declare t text;
begin
  foreach t in array array['profiles','contexts','goals','programs','projects','milestones','meetings',
                           'decisions','tasks','habits','habit_logs','notes','weekly_reviews']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- row level security ----------

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['contexts','goals','programs','projects','milestones','meetings',
                           'decisions','tasks','habits','habit_logs','notes','weekly_reviews']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.activity_logs enable row level security;
create policy "read own activity" on public.activity_logs for select to authenticated
  using (user_id = (select auth.uid()));
-- no insert/update/delete policy: only SECURITY DEFINER triggers write here.

-- anon gets nothing
revoke all on all tables in schema public from anon;
