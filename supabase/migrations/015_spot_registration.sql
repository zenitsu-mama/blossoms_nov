-- 015: On-spot registration at the venue.
--
-- An event's coordinator (or a super admin / content editor) adds students who turn up without registering
-- online. They are registered (as one team if a team name is given) and marked present in one step.
-- All registration limits are skipped: deadline, closed registration, seat limit, time clashes, team size.
-- A phone number is still required: students with none on file need one entered, and it is saved to their profile.
--
-- p_entries: [{ "register_number": "2510579", "phone": "9876543210" }, ...]  (phone optional if already on file)

create or replace function public.admin_spot_register(
  p_event_id  uuid,
  p_entries   jsonb,
  p_team_name text default null,
  p_slot_id   uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin    uuid := public.current_admin_profile_id();
  v_event    public.events%rowtype;
  v_name     text := nullif(trim(coalesce(p_team_name, '')), '');
  v_slot     uuid;
  v_session  jsonb;
  v_rows     jsonb := '[]'::jsonb;
  v_entry    jsonb;
  v_reg      text;
  v_phone    text;
  v_student  public.students%rowtype;
  v_missing  text[] := '{}';
  v_nophone  text[] := '{}';
  v_badphone text[] := '{}';
  v_taken    text[] := '{}';
  v_ids      uuid[] := '{}';
  v_team_id  uuid;
  v_sid      uuid;
  v_i        integer := 0;
begin
  if v_admin is null or not public.can_manage_event(p_event_id) then
    raise exception 'FORBIDDEN: you cannot add registrations for this event' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.status = 'cancelled' then
    return jsonb_build_object('success', false, 'error_code', 'EVENT_NOT_AVAILABLE', 'message', 'This event is not running.');
  end if;
  if v_event.is_mandatory then
    return jsonb_build_object('success', false, 'error_code', 'MANDATORY_EVENT',
      'message', 'Mandatory events have no registration. Every student is already on the attendance list.');
  end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    return jsonb_build_object('success', false, 'error_code', 'NO_STUDENTS', 'message', 'Add at least one register number.');
  end if;
  if v_name is not null and length(v_name) > 60 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_TEAM_NAME', 'message', 'Team name must be 60 characters or fewer.');
  end if;

  -- Session: the one picked, or the event's only session. Events held more than once need one picked.
  v_session := public.resolve_event_session(p_event_id, p_slot_id);
  if v_session ? 'error_code' then return v_session; end if;
  v_slot := (v_session->>'slot_id')::uuid;

  -- Check every entry first, so nothing is saved unless the whole entry is valid.
  for v_entry in select value from jsonb_array_elements(p_entries) loop
    v_reg := trim(coalesce(v_entry->>'register_number', ''));
    if v_reg = '' then continue; end if;
    v_phone := regexp_replace(coalesce(v_entry->>'phone', ''), '\D', '', 'g');
    if length(v_phone) = 12 and left(v_phone, 2) = '91' then v_phone := right(v_phone, 10); end if;

    select * into v_student from public.students where register_number = v_reg and student_status = 'active';
    if not found then
      v_missing := v_missing || v_reg;
      continue;
    end if;
    if v_student.id = any(v_ids) then continue; end if;

    if v_phone <> '' and v_phone !~ '^[6-9][0-9]{9}$' then
      v_badphone := v_badphone || v_reg;
    elsif v_phone = '' and coalesce(v_student.phone, '') = '' then
      v_nophone := v_nophone || (v_reg || ' (' || v_student.full_name || ')');
    end if;

    if exists(select 1 from public.event_registrations r
               where r.event_id = p_event_id and r.student_id = v_student.id and r.registration_status <> 'cancelled') then
      v_taken := v_taken || (v_reg || ' (' || v_student.full_name || ')');
    end if;

    v_ids := v_ids || v_student.id;
    v_rows := v_rows || jsonb_build_object('id', v_student.id, 'phone', nullif(v_phone, ''));
  end loop;

  if cardinality(v_missing) > 0 then
    return jsonb_build_object('success', false, 'error_code', 'MEMBER_NOT_FOUND',
      'message', 'Not on the student list: ' || array_to_string(v_missing, ', '));
  end if;
  if cardinality(v_ids) = 0 then
    return jsonb_build_object('success', false, 'error_code', 'NO_STUDENTS', 'message', 'Add at least one register number.');
  end if;
  if cardinality(v_badphone) > 0 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_PHONE',
      'message', 'Enter a 10-digit Indian mobile number for: ' || array_to_string(v_badphone, ', '));
  end if;
  if cardinality(v_nophone) > 0 then
    return jsonb_build_object('success', false, 'error_code', 'PHONE_REQUIRED',
      'message', 'A phone number is needed for: ' || array_to_string(v_nophone, ', '));
  end if;
  if cardinality(v_taken) > 0 then
    return jsonb_build_object('success', false, 'error_code', 'ALREADY_REGISTERED',
      'message', 'Already registered, mark them present in the list instead: ' || array_to_string(v_taken, ', '));
  end if;
  if v_name is not null and exists(
       select 1 from public.teams t where t.event_id = p_event_id and lower(t.team_name) = lower(v_name)
          and exists(select 1 from public.event_registrations r where r.team_id = t.id and r.registration_status <> 'cancelled')) then
    return jsonb_build_object('success', false, 'error_code', 'TEAM_NAME_TAKEN', 'message', 'Another team already uses that name for this event.');
  end if;

  -- Save phone numbers given at the venue.
  update public.students s set phone = (x->>'phone'), profile_complete = true, updated_at = now()
    from jsonb_array_elements(v_rows) x
   where s.id = (x->>'id')::uuid and x->>'phone' is not null;

  -- A team name makes one team; the first register number is the leader.
  if v_name is not null then
    insert into public.teams (event_id, team_name, leader_student_id, slot_id)
    values (p_event_id, v_name, v_ids[1], v_slot) returning id into v_team_id;
  end if;

  foreach v_sid in array v_ids loop
    v_i := v_i + 1;
    if v_team_id is not null then
      insert into public.team_members (team_id, student_id, is_leader) values (v_team_id, v_sid, v_i = 1);
    end if;

    insert into public.event_registrations (event_id, student_id, team_id, registration_status, registered_by_student_id, slot_id)
    values (p_event_id, v_sid, v_team_id, 'confirmed', null, v_slot)
    on conflict (event_id, student_id) do update
       set registration_status = 'confirmed', team_id = excluded.team_id, slot_id = excluded.slot_id,
           registered_at = now(), cancelled_at = null, registered_by_student_id = null;

    insert into public.event_attendance (event_id, student_id, status, marked_by, marked_at)
    values (p_event_id, v_sid, 'present', v_admin, now())
    on conflict (event_id, student_id) do update set status = 'present', marked_by = excluded.marked_by, marked_at = now();
  end loop;

  insert into public.audit_logs (actor_id, actor_role, action, resource, resource_id, detail)
  values (v_admin, public.current_admin_role()::text, 'spot_register', 'events', p_event_id,
          jsonb_build_object('students', to_jsonb(v_ids), 'team_id', v_team_id, 'team_name', v_name, 'slot_id', v_slot));

  return jsonb_build_object('success', true, 'count', cardinality(v_ids), 'team_id', v_team_id,
    'message', case when v_team_id is not null
                    then 'Team "' || v_name || '" (' || cardinality(v_ids) || ' students) registered and marked present.'
                    when cardinality(v_ids) = 1 then 'Registered and marked present.'
                    else cardinality(v_ids) || ' students registered and marked present.' end);
end $$;

revoke execute on function public.admin_spot_register(uuid, jsonb, text, uuid) from public, anon;
grant execute on function public.admin_spot_register(uuid, jsonb, text, uuid) to authenticated;
