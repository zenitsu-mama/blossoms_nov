-- 029: Events have a 1st and a 2nd place only. No third place.
--
-- admin_set_winners refuses any place other than 1 or 2 (ties, i.e. several winners for one place, are still allowed).
-- Any third places already declared are removed, so they stop showing on the Results page and stop earning points.

delete from public.event_winners where position not in (1, 2);

create or replace function public.admin_set_winners(p_event_id uuid, p_winners jsonb, p_notify boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_admin uuid := public.current_admin_profile_id(); v_title text; v_n integer;
begin
  if v_admin is null or not public.can_manage_event(p_event_id) then
    raise exception 'FORBIDDEN: you cannot declare winners for this event' using errcode = '42501';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_winners, '[]'::jsonb)) w
              where coalesce((w ->> 'position')::int, 0) not in (1, 2)) then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_PLACE',
      'message', 'Only 1st and 2nd place can be declared.');
  end if;
  select title into v_title from public.events where id = p_event_id;

  delete from public.event_winners where event_id = p_event_id;
  insert into public.event_winners (event_id, position, student_id, team_id, description, is_approved, declared_by, declared_at)
  select p_event_id, (w ->> 'position')::smallint, nullif(w ->> 'student_id', '')::uuid, nullif(w ->> 'team_id', '')::uuid,
         nullif(w ->> 'description', ''), true, v_admin, now()
  from jsonb_array_elements(coalesce(p_winners, '[]'::jsonb)) w;
  get diagnostics v_n = row_count;

  if p_notify and v_n > 0 then
    insert into public.notifications (title, body, link, audience, event_id, created_by)
    values ('Results: ' || v_title, 'Winners for ' || v_title || ' have been announced.', '/winners', 'event', p_event_id, v_admin);
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, resource, resource_id, detail)
  values (v_admin, public.current_admin_role()::text, 'set_winners', 'events', p_event_id, jsonb_build_object('count', v_n));
  return jsonb_build_object('success', true, 'count', v_n);
end $function$;
