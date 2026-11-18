-- Students may cancel (or withdraw a team) only within 24 hours of registering, and only while
-- registration is still open (not switched off by hand, and before the closing time).
create or replace function public.cancel_event_registration(p_registration_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid := public.current_student_id();
  v_reg   public.event_registrations%rowtype;
  v_event public.events%rowtype;
  v_team  public.teams%rowtype;
begin
  select * into v_reg from public.event_registrations where id = p_registration_id and student_id = v_student_id;
  if not found or v_reg.registration_status = 'cancelled' then
    return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Registration not found.');
  end if;

  select * into v_event from public.events where id = v_reg.event_id;
  if not v_event.cancellation_allowed then
    return jsonb_build_object('success', false, 'error_code', 'CANCELLATION_DISALLOWED', 'message', 'Cancellations are not allowed for this event.');
  end if;
  if v_event.registration_closed
     or (v_event.registration_closes_at is not null and now() > v_event.registration_closes_at) then
    return jsonb_build_object('success', false, 'error_code', 'CANCELLATION_CLOSED', 'message', 'Registration has closed, so this entry can no longer be cancelled.');
  end if;
  if now() > v_reg.registered_at + interval '24 hours' then
    return jsonb_build_object('success', false, 'error_code', 'CANCELLATION_WINDOW_OVER',
      'message', 'Registrations can only be cancelled within 24 hours of registering.');
  end if;

  if v_reg.team_id is not null then
    select * into v_team from public.teams where id = v_reg.team_id;
    if v_team.leader_student_id <> v_student_id then
      return jsonb_build_object('success', false, 'error_code', 'TEAM_MEMBER', 'message', 'Only your team leader can cancel this team entry.');
    end if;
    update public.event_registrations set registration_status = 'cancelled', cancelled_at = now()
     where team_id = v_reg.team_id and registration_status <> 'cancelled';
    insert into public.notifications (title, body, link, audience, student_id)
    select 'Team entry cancelled', 'Team "' || v_team.team_name || '" was withdrawn from ' || v_event.title || ' by the team leader.',
           '/app/my-events', 'student', tm.student_id
      from public.team_members tm where tm.team_id = v_team.id and tm.student_id <> v_student_id;
  else
    update public.event_registrations set registration_status = 'cancelled', cancelled_at = now() where id = p_registration_id;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, resource, resource_id, detail)
  values (v_student_id, 'student', 'cancel_registration', 'event_registrations', p_registration_id, jsonb_build_object('reason', p_reason));

  return jsonb_build_object('success', true, 'message', 'Registration cancelled.');
end $$;
