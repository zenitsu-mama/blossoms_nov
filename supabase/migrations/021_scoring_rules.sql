-- Scoring criteria (DOC Blossoms "Inter-House Event Scoring Sheet"), worked out live from the site's data.
--
--   Result points (per person):  1st 10 · 2nd 8 · 3rd 5 · Participation 1 · Walkover -2 · Class not registered -1
--   Event type multiplier:       Individual ×1 · Group ×0.5 · Class-wise ×0.5 (class-wise on hold = 0 until switched on)
--   Group / class-wise events:   team points = base × multiplier, split equally among the team's members; each member's
--                                share goes to their own class.
--   Penalties:                   one entry per class per event; not multiplied unless the switch is on.
--   Extra points:                manual, added as entered.
--
-- Where each part comes from:
--   * 1st / 2nd / 3rd   - winners declared on the admin Results page (event_winners).
--   * Participation     - students marked present on the Attendance page (not counting winners of that event).
--                         Mandatory events: every active student not marked absent, once the event is held.
--   * Walkover, class not registered, extra points - entered by super admins (class_points).
--
-- Only super admins can read or change any of it. The public sees team positions only.

-- ── Point values (one row, editable) ─────────────────────────
create table if not exists public.scoring_rules (
  id                        boolean primary key default true check (id),
  pts_first                 numeric not null default 10,
  pts_second                numeric not null default 8,
  pts_third                 numeric not null default 5,
  pts_participation         numeric not null default 1,
  pts_walkover              numeric not null default -2,
  pts_not_registered        numeric not null default -1,
  mult_individual           numeric not null default 1,
  mult_group                numeric not null default 0.5,
  mult_class_wise           numeric not null default 0.5,
  penalties_use_multiplier  boolean not null default false,
  class_wise_active         boolean not null default false,
  updated_at                timestamptz not null default now(),
  updated_by                uuid references public.admin_profiles(id) on delete set null
);
insert into public.scoring_rules (id) values (true) on conflict do nothing;

alter table public.scoring_rules enable row level security;
drop policy if exists scoring_rules_read on public.scoring_rules;
create policy scoring_rules_read on public.scoring_rules for select using (public.is_super_admin());
drop policy if exists scoring_rules_write on public.scoring_rules;
create policy scoring_rules_write on public.scoring_rules for update
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ── Event type for scoring (kept apart from events so coordinators cannot change it) ──
-- No row = from the event's format: individual -> Individual, team -> Group, either -> per entry.
create table if not exists public.event_scoring_types (
  event_id      uuid primary key references public.events(id) on delete cascade,
  scoring_type  text not null check (scoring_type in ('individual', 'group', 'class_wise'))
);
alter table public.event_scoring_types enable row level security;
drop policy if exists event_scoring_types_read on public.event_scoring_types;
create policy event_scoring_types_read on public.event_scoring_types for select using (public.is_super_admin());
drop policy if exists event_scoring_types_write on public.event_scoring_types;
create policy event_scoring_types_write on public.event_scoring_types for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ── Manual entries: penalties and extra points ───────────────
alter table public.class_points add column if not exists kind text not null default 'extra';
alter table public.class_points drop constraint if exists class_points_kind_check;
alter table public.class_points add constraint class_points_kind_check check (kind in ('extra', 'walkover', 'not_registered'));
alter table public.class_points drop constraint if exists class_points_points_check;
alter table public.class_points alter column points drop not null;
alter table public.class_points drop constraint if exists class_points_shape_check;
-- Extra points carry their own number; penalties take theirs from scoring_rules and must name the event.
alter table public.class_points add constraint class_points_shape_check check (
  (kind = 'extra' and points is not null and points <> 0 and abs(points) <= 100000)
  or (kind <> 'extra' and points is null and event_id is not null)
);
-- One walkover / not-registered entry per class per event.
create unique index if not exists class_points_one_penalty
  on public.class_points (scoring_class, event_id, kind) where kind <> 'extra';

-- ── Every scoring line ───────────────────────────────────────
-- One row per piece of points: (class, event, kind, points). Internal; callers check permissions.
create or replace function public.scoring_lines()
returns table (scoring_class text, event_id uuid, kind text, points numeric)
language sql stable security definer set search_path = public as $$
  with r as (select * from public.scoring_rules limit 1),
  cls as (
    select a.class_name, coalesce(a.scoring_class, a.class_name) as sc from public.class_team_assignments a
  ),
  ev as (
    select e.id, e.event_format::text as fmt, e.is_mandatory, st.scoring_type
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
     where ev.is_mandatory and public.event_held(ev.id) and s.student_status = 'active'
       and not exists (select 1 from public.event_attendance a where a.event_id = ev.id and a.student_id = s.id and a.status = 'absent')
       and not exists (select 1 from winner_people wp where wp.event_id = ev.id and wp.student_id = s.id)
  ),
  people as (
    select wp.event_id, wp.student_id, wp.kind, wp.pts from winner_people wp
    union all select cp.event_id, cp.student_id, 'participation', cp.pts from chosen_part cp
    union all select mp.event_id, mp.student_id, 'participation', mp.pts from mand_part mp
  )
  select c.sc, p.event_id, p.kind, p.pts
    from people p
    join public.students s on s.id = p.student_id
    join cls c on c.class_name = s.class_name
  union all
  select cp.scoring_class, cp.event_id, cp.kind,
         case cp.kind
           when 'extra' then cp.points
           else (case cp.kind when 'walkover' then r.pts_walkover else r.pts_not_registered end)
                * case when r.penalties_use_multiplier then coalesce(mu.m, 1) else 1 end
         end
    from public.class_points cp
    cross join r
    left join public.events e on e.id = cp.event_id
    left join mult mu on mu.id = cp.event_id and mu.team = (e.event_format::text = 'team')
$$;
revoke all on function public.scoring_lines() from public, anon, authenticated;

-- ── Class and team standings (super admins) ──────────────────
drop function if exists public.admin_scoreboard();
create function public.admin_scoreboard()
returns table (scoring_class text, team_id uuid, team_name text, team_color text,
               n_first numeric, n_second numeric, n_third numeric, n_participation numeric,
               n_walkover numeric, n_not_registered numeric, extra_points numeric,
               class_points numeric, class_position bigint, team_points numeric, team_position bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;
  return query
  with classes as (
    select distinct coalesce(a.scoring_class, a.class_name) as sc, a.fest_team_id as tid
      from public.class_team_assignments a
  ), l as (select * from public.scoring_lines()),
  per as (
    select c.sc, c.tid,
           count(distinct l.event_id) filter (where l.kind = 'first')::numeric as f,
           count(distinct l.event_id) filter (where l.kind = 'second')::numeric as s2,
           count(distinct l.event_id) filter (where l.kind = 'third')::numeric as t3,
           count(*) filter (where l.kind = 'participation')::numeric as p,
           count(*) filter (where l.kind = 'walkover')::numeric as w,
           count(*) filter (where l.kind = 'not_registered')::numeric as nr,
           coalesce(sum(l.points) filter (where l.kind = 'extra'), 0) as x,
           coalesce(sum(l.points), 0) as pts
      from classes c left join l on l.scoring_class = c.sc
     group by c.sc, c.tid
  ), teams as (
    select t.id, t.name, t.color, coalesce(sum(per.pts), 0) as tp
      from public.fest_teams t left join per on per.tid = t.id
     group by t.id
  )
  select per.sc, t.id, t.name, t.color, per.f, per.s2, per.t3, per.p, per.w, per.nr, per.x,
         round(per.pts, 2),
         rank() over (order by per.pts desc),
         round(t.tp, 2),
         dense_rank() over (order by t.tp desc)
    from per join teams t on t.id = per.tid
   order by per.pts desc, per.sc;
end $$;
revoke all on function public.admin_scoreboard() from public, anon;
grant execute on function public.admin_scoreboard() to authenticated;

-- What one event gave each class (super admins), to check results after entering them.
create or replace function public.admin_event_scores(p_event_id uuid)
returns table (scoring_class text, team_name text, team_color text, kind text, entries bigint, points numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'FORBIDDEN';
  end if;
  return query
  select l.scoring_class, t.name, t.color, l.kind, count(*), round(sum(l.points), 2)
    from public.scoring_lines() l
    left join (select distinct coalesce(a.scoring_class, a.class_name) as sc, a.fest_team_id from public.class_team_assignments a) c
      on c.sc = l.scoring_class
    left join public.fest_teams t on t.id = c.fest_team_id
   where l.event_id = p_event_id
   group by l.scoring_class, t.name, t.color, l.kind
   order by sum(l.points) desc, l.scoring_class;
end $$;
revoke all on function public.admin_event_scores(uuid) from public, anon;
grant execute on function public.admin_event_scores(uuid) to authenticated;

-- ── Team positions for the public (no points) ────────────────
create or replace function public.get_team_positions()
returns table (team_id uuid, name text, color text, "position" bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce((select leaderboard_public from public.fest_settings limit 1), false) and not public.is_super_admin() then
    return;
  end if;
  return query
  with l as (select * from public.scoring_lines()),
  tp as (
    select t.id, t.name, t.color, t.display_order,
           coalesce((select sum(l.points) from l
                      where l.scoring_class in (select coalesce(a.scoring_class, a.class_name)
                                                  from public.class_team_assignments a
                                                 where a.fest_team_id = t.id)), 0) as pts
      from public.fest_teams t
  )
  select tp.id, tp.name, tp.color,
         case when exists (select 1 from l) then rank() over (order by tp.pts desc) end
    from tp
   order by tp.pts desc, tp.display_order;
end $$;
grant execute on function public.get_team_positions() to anon, authenticated;

create or replace function public.get_team_leaderboard()
returns table (team_id uuid, name text, color text, classes bigint, points numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce((select leaderboard_public from public.fest_settings limit 1), false) and not public.is_super_admin() then
    return;
  end if;
  return query
  with l as (select * from public.scoring_lines())
  select ft.id, ft.name, ft.color,
         (select count(*) from public.class_team_assignments c where c.fest_team_id = ft.id),
         case when public.is_super_admin() then
           coalesce((select sum(l.points) from l
                      where l.scoring_class in (select coalesce(a.scoring_class, a.class_name)
                                                  from public.class_team_assignments a where a.fest_team_id = ft.id)), 0)
         else 0 end::numeric
  from public.fest_teams ft
  order by ft.display_order, ft.name;
end $$;
