-- Sessions (event_schedule_slots) could be changed by ANY admin, including coordinators with no events and
-- analysts. Now only those who can manage the event may change its sessions: super admins, content editors and
-- the event's assigned coordinators (same rule as winners, attendance and event details).
-- Reading is unchanged (everyone can read the schedule). The app saves sessions through admin_save_event_slot /
-- admin_delete_event_slot, which already check can_manage_event; this closes the direct table path.

drop policy if exists "Admin can manage schedule slots" on public.event_schedule_slots;
drop policy if exists "Event managers manage schedule slots" on public.event_schedule_slots;
create policy "Event managers manage schedule slots" on public.event_schedule_slots
  for all using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));
