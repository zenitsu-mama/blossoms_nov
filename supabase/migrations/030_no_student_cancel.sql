-- 030: Students can no longer cancel a registration or withdraw a team.
--
-- The Cancel / Withdraw button is gone from My Events, and the database refuses the request too, so an old open tab
-- can't cancel either. Super admins can still delete a registration from the Attendance page (migration 026).
-- To allow cancelling again, re-run 027_cancel_window.sql.
create or replace function public.cancel_event_registration(p_registration_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object('success', false, 'error_code', 'CANCELLATION_DISALLOWED',
    'message', 'Registrations can''t be cancelled. Contact the event coordinator if you can''t take part.');
end $$;

revoke execute on function public.cancel_event_registration(uuid, text) from public, anon;
grant execute on function public.cancel_event_registration(uuid, text) to authenticated;
