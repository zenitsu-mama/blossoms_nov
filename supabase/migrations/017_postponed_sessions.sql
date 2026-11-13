-- Postponed sessions: status 'rescheduled' keeps the old date in the row but every page shows "Postponed".
-- Saving a new date or start time for a postponed session makes it a normal session again.

create or replace function public.slot_clear_postponed()
returns trigger language plpgsql as $$
begin
  if old.status = 'rescheduled' and new.status = 'rescheduled'
     and (new.slot_date is distinct from old.slot_date or new.starts_at is distinct from old.starts_at) then
    new.status := 'scheduled';
  end if;
  return new;
end;
$$;

drop trigger if exists slot_clear_postponed on public.event_schedule_slots;
create trigger slot_clear_postponed
  before update on public.event_schedule_slots
  for each row execute function public.slot_clear_postponed();

-- The timetable now says which sessions are postponed (return type changes, so drop first).
drop function if exists public.public_schedule();
create function public.public_schedule()
returns table (
  event_id       uuid,
  title          text,
  slug           text,
  status         text,
  category_name  text,
  category_slug  text,
  slot_id        uuid,
  slot_date      date,
  starts_at      timestamptz,
  slot_title     text,
  venue_name     text,
  venue_building text,
  slot_status    text
) language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.slug, e.status::text, c.name, c.slug,
         s.id, coalesce(s.slot_date, (s.starts_at at time zone 'Asia/Kolkata')::date), s.starts_at, s.slot_title,
         v.name, v.building, s.status::text
    from public.events e
    join public.event_schedule_slots s on s.event_id = e.id
    left join public.event_categories c on c.id = e.category_id
    left join public.venues v on v.id = s.venue_id
   where e.status in ('published', 'completed', 'draft')
     and s.status <> 'cancelled'
   order by 8, s.starts_at nulls last, e.title;
$$;

revoke execute on function public.public_schedule() from public;
grant execute on function public.public_schedule() to anon, authenticated;
