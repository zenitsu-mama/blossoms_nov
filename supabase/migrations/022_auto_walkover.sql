-- Scoring changes:
--   * Mandatory events score as Class-wise by default (on hold = 0 points until class-wise scoring is switched on).
--     A super admin can still set another type for an event.
--   * Walkover is automatic: a class gets the walkover points for an event when it had students registered,
--     attendance was taken for them, and none of them were present (all marked absent). Once per class per event.
--   * "Class not registered" no longer scores. Manual entries are extra points only.
--   * Lines worth 0 points (e.g. class-wise events on hold) are left out, so counts only show what scored.

create or replace function public.scoring_lines()
returns table (scoring_class text, event_id uuid, kind text, points numeric)
language sql stable security definer set search_path = public as $$
  with r as (select * from public.scoring_rules limit 1),
  cls as (
    select a.class_name, coalesce(a.scoring_class, a.class_name) as sc from public.class_team_assignments a
  ),
  ev as (
    select e.id, e.event_format::text as fmt, e.is_mandatory,
           coalesce(st.scoring_type, case when e.is_mandatory then 'class_wise' end) as scoring_type
      from public.events e left join public.event_scoring_types st on st.event_id = e.id
     where e.status in ('published', 'completed')
  ),
  -- Multiplier for an event, for a solo entry (team = false) or a team entry (team = true).
  mult as (
    select ev.id, t.team,
           case coalesce(ev.scoring_type,
                         case ev.fmt when 'individual' then 'individual' when 'team' then 'group'
                                     else case when t.team then 'group' else 'individual' end end)
             when 'individual' then r.mult_individual
             when 'group'      then r.mult_group
             else case when r.class_wise_active then r.mult_class_wise else 0 end
           end as m
      from ev cross join (values (false), (true)) as t(team) cross join r
  ),
  -- Active team sizes (members still registered).
  team_size as (
    select reg.team_id, count(*) as n
      from public.event_registrations reg
     where reg.team_id is not null and reg.registration_status <> 'cancelled'
     group by reg.team_id
  ),
  base as (
    select w.event_id, w.student_id, w.team_id,
           case w.position when 1 then 'first' when 2 then 'second' else 'third' end as kind,
           case w.position when 1 then r.pts_first when 2 then r.pts_second else r.pts_third end as pts
      from public.event_winners w cross join r
     where w.position between 1 and 3
  ),
  -- Winners: solo winners score for their class; a winning team's points are split among its members.
  winner_people as (
    select b.event_id, b.student_id, b.kind, b.pts * mu.m as pts
      from base b join mult mu on mu.id = b.event_id and not mu.team
     where b.student_id is not null
    union all
    select b.event_id, reg.student_id, b.kind, b.pts * mu.m / ts.n
      from base b
      join mult mu on mu.id = b.event_id and mu.team
      join team_size ts on ts.team_id = b.team_id
      join public.event_registrations reg on reg.team_id = b.team_id and reg.registration_status <> 'cancelled'
     where b.team_id is not null
  ),
  -- Participation at chosen events: present, registered, and not a winner of that event.
  chosen_part as (
    select reg.event_id, reg.student_id,
           r.pts_participation * mu.m / coalesce(ts.n, 1) as pts
      from public.event_registrations reg
      join ev on ev.id = reg.event_id and not ev.is_mandatory
      join public.event_attendance a on a.event_id = reg.event_id and a.student_id = reg.student_id and a.status = 'present'
      join mult mu on mu.id = reg.event_id and mu.team = (reg.team_id is not null)
      left join team_size ts on ts.team_id = reg.team_id
      cross join r
     where reg.registration_status <> 'cancelled'
       and not exists (select 1 from winner_people wp where wp.event_id = reg.event_id and wp.student_id = reg.student_id)
  ),
  -- Participation at mandatory events: every active student not marked absent, once the event is held.
  mand_part as (
    select ev.id as event_id, s.id as student_id, r.pts_participation * mu.m as pts
      from ev
      join mult mu on mu.id = ev.id and not mu.team
      cross join public.students s
      cross join r
     where ev.is_mandatory and mu.m <> 0 and public.event_held(ev.id) and s.student_status = 'active'
       and not exists (select 1 from public.event_attendance a where a.event_id = ev.id and a.student_id = s.id and a.status = 'absent')
       and not exists (select 1 from winner_people wp where wp.event_id = ev.id and wp.student_id = s.id)
  ),
  people as (
    select wp.event_id, wp.student_id, wp.kind, wp.pts from winner_people wp
    union all select cp.event_id, cp.student_id, 'participation', cp.pts from chosen_part cp
    union all select mp.event_id, mp.student_id, 'participation', mp.pts from mand_part mp
  ),
  -- Walkover, per class per (chosen) event. An entry is a solo student or a whole team; it "showed up" if any of
  -- its members was present, and "did not show" if attendance was taken and nobody in it was present. A class gets
  -- a walkover when it had entries, at least one did not show, and none of the entries it is part of showed up.
  entry_att as (
    select reg.event_id, coalesce(reg.team_id, reg.student_id) as entry,
           bool_or(a.status = 'present') as showed,
           bool_or(a.status = 'absent')  as marked_absent
      from public.event_registrations reg
      join ev on ev.id = reg.event_id and not ev.is_mandatory
      left join public.event_attendance a on a.event_id = reg.event_id and a.student_id = reg.student_id
     where reg.registration_status <> 'cancelled'
     group by reg.event_id, coalesce(reg.team_id, reg.student_id)
  ),
  class_att as (
    select reg.event_id, c.sc,
           count(distinct ea.entry) filter (where ea.showed) as present,
           count(distinct ea.entry) filter (where ea.marked_absent and not coalesce(ea.showed, false)) as absent
      from public.event_registrations reg
      join public.students s on s.id = reg.student_id
      join cls c on c.class_name = s.class_name
      join entry_att ea on ea.event_id = reg.event_id and ea.entry = coalesce(reg.team_id, reg.student_id)
     where reg.registration_status <> 'cancelled'
     group by reg.event_id, c.sc
  ),
  walkovers as (
    select ca.sc, ca.event_id,
           r.pts_walkover * case when r.penalties_use_multiplier then coalesce(mu.m, 1) else 1 end as pts
      from class_att ca
      cross join r
      join public.events e on e.id = ca.event_id
      left join mult mu on mu.id = ca.event_id and mu.team = (e.event_format::text = 'team')
     where ca.present = 0 and ca.absent > 0
  ),
  all_lines as (
    select c.sc, p.event_id, p.kind, p.pts
      from people p
      join public.students s on s.id = p.student_id
      join cls c on c.class_name = s.class_name
    union all
    select w.sc, w.event_id, 'walkover', w.pts from walkovers w
    union all
    select cp.scoring_class, cp.event_id, 'extra', cp.points
      from public.class_points cp
     where cp.kind = 'extra'
  )
  select al.sc, al.event_id, al.kind, al.pts from all_lines al where al.pts <> 0
$$;
revoke all on function public.scoring_lines() from public, anon, authenticated;
