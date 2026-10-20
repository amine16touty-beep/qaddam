-- Google Calendar (and any calendar app) subscribes to a private .ics link per person.
-- The link carries a random token; changing the token cuts off the old link.

alter table public.profiles add column calendar_token uuid unique;

-- What the feed shows: the owner's meetings from the last 6 months onwards.
-- security definer because the calendar app calls it without signing in; the token is the key.
create or replace function public.calendar_feed(p_token uuid)
returns table (id uuid, title text, starts_at timestamptz, ends_at timestamptz, location text, url text,
               agenda text, participants text[], updated_at timestamptz, timezone text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.title, m.starts_at, m.ends_at, m.location, m.url, m.agenda, m.participants, m.updated_at, p.timezone
    from public.profiles p
    join public.meetings m on m.user_id = p.id
   where p_token is not null
     and p.calendar_token = p_token
     and m.deleted_at is null
     and m.starts_at > now() - interval '180 days'
   order by m.starts_at
   limit 2000
$$;

revoke execute on function public.calendar_feed(uuid) from public;
grant execute on function public.calendar_feed(uuid) to anon, authenticated;
