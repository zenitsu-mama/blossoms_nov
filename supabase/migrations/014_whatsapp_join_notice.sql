-- 014: Tell students to join the event's WhatsApp group as soon as they are registered.
--
-- When a registration becomes confirmed (a solo sign-up, every member of a team entry, or a re-registration)
-- and the event has a WhatsApp group link, the student gets a notification that opens My events, where the
-- "Join WhatsApp group" button is. Waitlisted entries get nothing until they are confirmed.

create or replace function public.notify_whatsapp_group_on_registration()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_url   text;
begin
  if new.registration_status <> 'confirmed' then return new; end if;
  if tg_op = 'UPDATE' and old.registration_status = 'confirmed' then return new; end if;

  select e.title, nullif(trim(e.whatsapp_group_url), '') into v_title, v_url
    from public.events e where e.id = new.event_id;
  if v_url is null then return new; end if;

  insert into public.notifications (title, body, link, audience, student_id)
  values ('Join the ' || v_title || ' WhatsApp group',
          'You are registered for ' || v_title || '. Join the event''s WhatsApp group for updates from the event heads. Open My events and tap "Join WhatsApp group".',
          '/app/my-events', 'student', new.student_id);
  return new;
end $$;

revoke execute on function public.notify_whatsapp_group_on_registration() from public, anon, authenticated;

drop trigger if exists whatsapp_group_notice on public.event_registrations;
create trigger whatsapp_group_notice
  after insert or update of registration_status on public.event_registrations
  for each row execute function public.notify_whatsapp_group_on_registration();
