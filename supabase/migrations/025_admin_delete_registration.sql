-- Admins can delete a registration (with its attendance and team membership). Only event managers
-- (can_manage_event) may do it, and the audit log keeps who was removed.

-- Registrations list needs the registration and event ids to offer a delete button.
drop function if exists public.admin_participation_rows();
create function public.admin_participation_rows()
returns table(event_title text, category text, event_date date, register_number text, full_name text, class_name text,
              phone text, team_name text, is_leader boolean, registration_status text, registered_at timestamptz,
              attendance_status text, marked_at timestamptz, registration_id uuid, event_id uuid)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query
  select e.title, c.name,
         (select coalesce(min(sl.starts_at)::date, min(sl.slot_date)) from public.event_schedule_slots sl where sl.event_id = e.id),
         s.register_number, s.full_name, s.class_name, s.phone, t.team_name,
         coalesce(t.leader_student_id = s.id, false),
         er.registration_status::text, er.registered_at, ea.status::text, ea.marked_at, er.id, e.id
  from public.event_registrations er
  join public.events e on e.id = er.event_id
  join public.event_categories c on c.id = e.category_id
  join public.students s on s.id = er.student_id
  left join public.teams t on t.id = er.team_id
  left join public.event_attendance ea on ea.event_id = er.event_id and ea.student_id = er.student_id
  where er.registration_status <> 'cancelled'
  order by e.title, s.class_name, s.full_name;
end $$;
revoke all on function public.admin_participation_rows() from public, anon;
grant execute on function public.admin_participation_rows() to authenticated;

create or replace function public.admin_delete_registration(p_registration_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_admin   uuid := public.current_admin_profile_id();
  v_reg     public.event_registrations%rowtype;
  v_student public.students%rowtype;
  v_event   public.events%rowtype;
  v_team    public.teams%rowtype;
  v_next    uuid;
begin
  select * into v_reg from public.event_registrations where id = p_registration_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Registration not found. It may already be deleted.');
  end if;
  if v_admin is null or not public.can_manage_event(v_reg.event_id) then
    raise exception 'FORBIDDEN: you cannot delete registrations for this event' using errcode = '42501';
  end if;

  select * into v_student from public.students where id = v_reg.student_id;
  select * into v_event from public.events where id = v_reg.event_id;
  if v_reg.team_id is not null then
    select * into v_team from public.teams where id = v_reg.team_id for update;
  end if;

  -- Winners carry points: change the results first rather than silently dropping a winner.
  if exists (select 1 from public.event_winners w where w.event_id = v_reg.event_id
              and (w.student_id = v_reg.student_id or (v_reg.team_id is not null and w.team_id = v_reg.team_id))) then
    return jsonb_build_object('success', false, 'error_code', 'IS_WINNER',
      'message', v_student.full_name || ' is listed as a winner of ' || v_event.title || '. Remove them from the results first.');
  end if;

  delete from public.event_attendance where event_id = v_reg.event_id and student_id = v_reg.student_id;
  delete from public.event_registrations where id = p_registration_id;

  if v_reg.team_id is not null then
    delete from public.team_members where team_id = v_reg.team_id and student_id = v_reg.student_id;
    if v_team.leader_student_id = v_reg.student_id then
      select tm.student_id into v_next from public.team_members tm
        join public.event_registrations er on er.team_id = tm.team_id and er.student_id = tm.student_id and er.registration_status <> 'cancelled'
       where tm.team_id = v_reg.team_id order by tm.joined_at, tm.id limit 1;
      if v_next is not null then
        update public.teams set leader_student_id = v_next where id = v_reg.team_id;
        update public.team_members set is_leader = (student_id = v_next) where team_id = v_reg.team_id;
      end if;
    end if;
    -- Team left with no active members: remove it (cancelled rows keep no link to it).
    if not exists (select 1 from public.event_registrations where team_id = v_reg.team_id and registration_status <> 'cancelled') then
      update public.event_registrations set team_id = null where team_id = v_reg.team_id;
      delete from public.teams where id = v_reg.team_id;
    end if;
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, resource, resource_id, detail)
  values (v_admin, public.current_admin_role()::text, 'delete_registration', 'event_registrations', p_registration_id,
          jsonb_build_object('event_id', v_reg.event_id, 'event_title', v_event.title,
                             'student_id', v_reg.student_id, 'register_number', v_student.register_number, 'full_name', v_student.full_name,
                             'team_id', v_reg.team_id, 'team_name', v_team.team_name, 'registration_status', v_reg.registration_status,
                             'registered_at', v_reg.registered_at, 'slot_id', v_reg.slot_id));

  return jsonb_build_object('success', true,
    'message', v_student.full_name || '''s registration for ' || v_event.title || ' was deleted.');
end $$;
revoke all on function public.admin_delete_registration(uuid) from public, anon;
grant execute on function public.admin_delete_registration(uuid) to authenticated;
