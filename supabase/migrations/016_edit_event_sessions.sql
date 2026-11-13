-- 016: Edit an event's date, time and venue from the admin event editor, and one live schedule for every page.
--
-- Before this, sessions (event_schedule_slots) could not be changed from the admin console, and the Schedule pages
-- showed a copy of the timetable built into the site. Now:
--   admin_save_event_slot   adds or changes one session (date, start, end, venue) and tells registered students.
--   admin_delete_event_slot removes a session nobody is registered in.
--   public_schedule         the timetable every page reads, including draft events (they stay on the schedule
--                           while hidden from the Events page). Cancelled and archived events are left out.

-- ── Save one session ──────────────────────────────────────────────────────────
create or replace function public.admin_save_event_slot(
  p_event_id uuid,
  p_slot_id  uuid,          -- null adds a new session
  p_date     date,
  p_start    time default null,
  p_end      time default null,
  p_venue    text default null,   -- a venue name; a name not on the list is added
  p_notify   boolean default true
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin    uuid := public.current_admin_profile_id();
  v_title    text;
  v_venue    text := nullif(trim(coalesce(p_venue, '')), '');
  v_venue_id uuid;
  v_starts   timestamptz;
  v_ends     timestamptz;
  v_old      public.event_schedule_slots%rowtype;
  v_slot     uuid;
  v_changed  boolean := false;
  v_when     text;
  v_notified integer := 0;
  v_single   boolean;
begin
  if v_admin is null or not public.can_manage_event(p_event_id) then
    raise exception 'FORBIDDEN: you cannot edit this event' using errcode = '42501';
  end if;
  select title into v_title from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'EVENT_NOT_FOUND', 'message', 'Event not found.');
  end if;
  if p_date is null then
    return jsonb_build_object('success', false, 'error_code', 'DATE_REQUIRED', 'message', 'Pick a date.');
  end if;
  -- Both times or neither (neither = timing TBA, e.g. online submissions).
  if (p_start is null) <> (p_end is null) then
    return jsonb_build_object('success', false, 'error_code', 'TIMES_INCOMPLETE',
      'message', 'Give both a start and an end time, or leave both empty for timing TBA.');
  end if;
  if p_start is not null and p_end is not null and p_end <= p_start then
    return jsonb_build_object('success', false, 'error_code', 'END_BEFORE_START', 'message', 'End time must be after the start time.');
  end if;
  if v_venue is not null and length(v_venue) > 80 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_VENUE', 'message', 'Venue name must be 80 characters or fewer.');
  end if;

  -- Venue by name: reuse the one on the list, or add it.
  if v_venue is not null then
    select id into v_venue_id from public.venues where lower(name) = lower(v_venue) order by created_at limit 1;
    if v_venue_id is null then
      insert into public.venues (name) values (v_venue) returning id into v_venue_id;
    end if;
  end if;

  v_starts := case when p_start is not null then (p_date + p_start) at time zone 'Asia/Kolkata' end;
  v_ends   := case when p_end   is not null then (p_date + p_end)   at time zone 'Asia/Kolkata' end;

  if p_slot_id is null then
    insert into public.event_schedule_slots (event_id, venue_id, slot_date, starts_at, ends_at)
    values (p_event_id, v_venue_id, p_date, v_starts, v_ends) returning id into v_slot;
  else
    select * into v_old from public.event_schedule_slots where id = p_slot_id and event_id = p_event_id for update;
    if not found then
      return jsonb_build_object('success', false, 'error_code', 'SLOT_NOT_FOUND', 'message', 'That session no longer exists. Reload the page.');
    end if;
    v_changed := v_old.slot_date is distinct from p_date
              or v_old.starts_at is distinct from v_starts
              or v_old.venue_id  is distinct from v_venue_id;
    update public.event_schedule_slots
       set venue_id = v_venue_id, slot_date = p_date, starts_at = v_starts, ends_at = v_ends
     where id = p_slot_id;
    v_slot := p_slot_id;
  end if;

  -- Tell registered students when the date, start time or venue moved (end times are admin-only).
  if v_changed and p_notify then
    select count(*) = 1 into v_single from public.event_schedule_slots where event_id = p_event_id;
    v_when := coalesce(to_char(v_starts at time zone 'Asia/Kolkata', 'Dy, FMDD Mon · FMHH12:MI AM'),
                       to_char(p_date, 'Dy, FMDD Mon'))
              || coalesce(' · ' || v_venue, '');
    insert into public.notifications (title, body, link, audience, student_id)
    select v_title || ': new time or venue',
           v_title || ' is now on ' || v_when || '. Check My events for details.',
           '/app/my-events', 'student', r.student_id
      from public.event_registrations r
     where r.event_id = p_event_id
       and r.registration_status in ('confirmed', 'waitlisted')
       and (r.slot_id = v_slot or (r.slot_id is null and v_single));
    get diagnostics v_notified = row_count;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, resource, resource_id, detail)
  values (v_admin, public.current_admin_role()::text,
          case when p_slot_id is null then 'slot_create' else 'slot_update' end,
          'event_schedule_slots', v_slot,
          jsonb_build_object('event_id', p_event_id, 'title', v_title, 'date', p_date, 'start', p_start, 'end', p_end,
                             'venue', v_venue, 'notified', v_notified));

  return jsonb_build_object('success', true, 'slot_id', v_slot, 'notified', v_notified,
    'message', case when v_notified > 0 then 'Session saved. ' || v_notified || ' registered students were told.'
                    else 'Session saved.' end);
end $$;

revoke execute on function public.admin_save_event_slot(uuid, uuid, date, time, time, text, boolean) from public, anon;
grant execute on function public.admin_save_event_slot(uuid, uuid, date, time, time, text, boolean) to authenticated;

-- ── Remove one session ────────────────────────────────────────────────────────
create or replace function public.admin_delete_event_slot(p_slot_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := public.current_admin_profile_id();
  v_slot  public.event_schedule_slots%rowtype;
begin
  select * into v_slot from public.event_schedule_slots where id = p_slot_id;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'SLOT_NOT_FOUND', 'message', 'That session no longer exists.');
  end if;
  if v_admin is null or not public.can_manage_event(v_slot.event_id) then
    raise exception 'FORBIDDEN: you cannot edit this event' using errcode = '42501';
  end if;
  if (select count(*) from public.event_schedule_slots where event_id = v_slot.event_id) <= 1 then
    return jsonb_build_object('success', false, 'error_code', 'LAST_SESSION', 'message', 'An event needs at least one session. Change it instead.');
  end if;
  if exists(select 1 from public.event_registrations
             where slot_id = p_slot_id and registration_status <> 'cancelled') then
    return jsonb_build_object('success', false, 'error_code', 'SLOT_IN_USE',
      'message', 'Students are registered in this session. Change its time instead, or cancel those registrations first.');
  end if;

  delete from public.event_schedule_slots where id = p_slot_id;

  insert into public.audit_logs (actor_id, actor_role, action, resource, resource_id, detail)
  values (v_admin, public.current_admin_role()::text, 'slot_delete', 'event_schedule_slots', p_slot_id,
          jsonb_build_object('event_id', v_slot.event_id, 'date', v_slot.slot_date, 'starts_at', v_slot.starts_at));

  return jsonb_build_object('success', true, 'message', 'Session removed.');
end $$;

revoke execute on function public.admin_delete_event_slot(uuid) from public, anon;
grant execute on function public.admin_delete_event_slot(uuid) to authenticated;

-- ── The timetable every page reads ───────────────────────────────────────────
create or replace function public.public_schedule()
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
  venue_building text
) language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.slug, e.status::text, c.name, c.slug,
         s.id, coalesce(s.slot_date, (s.starts_at at time zone 'Asia/Kolkata')::date), s.starts_at, s.slot_title,
         v.name, v.building
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
