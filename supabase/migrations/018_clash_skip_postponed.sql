-- Time clashes ignore postponed ('rescheduled') and cancelled sessions: their old times are not real any more.
-- Same function as 013, with the two status checks added.
create or replace function public.session_clash(p_student_id uuid, p_slot_id uuid, p_event_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select e.title || ' at ' || to_char(theirs.starts_at at time zone 'Asia/Kolkata', 'FMHH12:MI AM, DD Mon')
    from public.event_schedule_slots mine
    join public.event_registrations er
      on er.student_id = p_student_id and er.event_id <> p_event_id and er.registration_status <> 'cancelled'
    join public.event_schedule_slots theirs
      on theirs.id = er.slot_id or (er.slot_id is null and theirs.event_id = er.event_id)
    join public.events e on e.id = er.event_id
   where mine.id = p_slot_id
     and mine.status not in ('rescheduled', 'cancelled')
     and theirs.status not in ('rescheduled', 'cancelled')
     and mine.starts_at is not null and theirs.starts_at is not null
     and mine.starts_at < coalesce(theirs.ends_at, theirs.starts_at + interval '1 hour')
     and theirs.starts_at < coalesce(mine.ends_at, mine.starts_at + interval '1 hour')
   order by theirs.starts_at
   limit 1
$$;
revoke all on function public.session_clash(uuid, uuid, uuid) from public, anon, authenticated;
