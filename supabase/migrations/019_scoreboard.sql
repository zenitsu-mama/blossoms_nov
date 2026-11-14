-- Blossoms scoreboard.
--   * The four fest teams (Sentinels, Mavericks, Titans, Ascendents) and which class plays for each.
--     Classes use the student-record (even semester) names; the "F" sections are renamed "WI".
--     Two joint classes score as one: "8 BCOM F&I - AFA HON BCC" and "8 BCOM A&T - SF HON BCC".
--   * class_points: hidden points per scoring class (admins only). Class positions and team positions
--     (team = sum of its classes) are worked out from them.
--   * The public sees team positions 1-4 only, never points, and only once the board is switched on.

-- ── F sections are WI ────────────────────────────────────────
update public.students              set class_name = regexp_replace(class_name, ' F$', ' WI') where class_name ~ '^[0-9] BCOM F$';
update public.class_representatives set class_name = regexp_replace(class_name, ' F$', ' WI') where class_name ~ '^[0-9] BCOM F$';
update public.class_team_assignments set class_name = regexp_replace(class_name, ' F$', ' WI') where class_name ~ '^[0-9] BCOM F$';

-- ── Teams ────────────────────────────────────────────────────
insert into public.fest_teams (name, color, display_order) values
  ('Sentinels',  '#4472C4', 1),
  ('Mavericks',  '#ED7D31', 2),
  ('Titans',     '#70AD47', 3),
  ('Ascendents', '#FFC000', 4)
on conflict (name) do update set color = excluded.color, display_order = excluded.display_order;

-- A class scores under its own name unless it is part of a joint class.
alter table public.class_team_assignments add column if not exists scoring_class text;

insert into public.class_team_assignments (class_name, fest_team_id, scoring_class)
select a.class_name, t.id, a.scoring_class
  from (values
    ('2 BCOM A','Sentinels',null), ('2 BCOM D','Sentinels',null), ('2 BCOM F&I B','Sentinels',null),
    ('4 BCOM AFA','Sentinels',null), ('4 BCOM F&I A','Sentinels',null), ('6 BCOM C','Sentinels',null),
    ('6 BCOM SF','Sentinels',null), ('6 BSc A&A','Sentinels',null), ('4 MCOM','Sentinels',null),
    ('8 BCOM H BCC A','Sentinels',null),

    ('2 BCOM WI','Mavericks',null), ('2 BCOM A&T','Mavericks',null), ('2 BCOM F&I A','Mavericks',null),
    ('4 BCOM C','Mavericks',null), ('4 BCOM SF','Mavericks',null), ('4 BSc A&A','Mavericks',null),
    ('6 BCOM B','Mavericks',null), ('6 BCOM AFA','Mavericks',null), ('6 BCOM F&I B','Mavericks',null),
    ('8 BCOM H BCC B','Mavericks',null),

    ('2 BCOM C','Titans',null), ('2 BCOM SF','Titans',null), ('2 BSc A&A','Titans',null),
    ('4 BCOM B','Titans',null), ('4 BCOM WI','Titans',null), ('4 BCOM F&I B','Titans',null),
    ('6 BCOM A','Titans',null), ('6 BCOM D','Titans',null), ('6 BCOM A&T','Titans',null),
    ('8 BCOM F&I HON BCC','Titans','8 BCOM F&I - AFA HON BCC'),
    ('8 BCOM AFA HON BCC','Titans','8 BCOM F&I - AFA HON BCC'),

    ('2 BCOM B','Ascendents',null), ('2 BCOM AFA','Ascendents',null), ('4 BCOM A','Ascendents',null),
    ('4 BCOM D','Ascendents',null), ('4 BCOM A&T','Ascendents',null), ('6 BCOM WI','Ascendents',null),
    ('6 BCOM F&I A','Ascendents',null), ('2 MCOM','Ascendents',null),
    ('8 BCOM A&T HON BCC','Ascendents','8 BCOM A&T - SF HON BCC'),
    ('8 BCOM SF HON BCC','Ascendents','8 BCOM A&T - SF HON BCC')
  ) as a(class_name, team, scoring_class)
  join public.fest_teams t on t.name = a.team
on conflict (class_name) do update set fest_team_id = excluded.fest_team_id, scoring_class = excluded.scoring_class;

-- ── Hidden class points ──────────────────────────────────────
create table if not exists public.class_points (
  id             uuid primary key default gen_random_uuid(),
  scoring_class  text not null check (length(trim(scoring_class)) between 1 and 80),
  points         numeric not null check (points <> 0 and abs(points) <= 100000),
  event_id       uuid references public.events(id) on delete set null,
  note           text check (note is null or length(note) <= 200),
  created_by     uuid references public.admin_profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists class_points_class_idx on public.class_points (scoring_class);

alter table public.class_points enable row level security;
drop policy if exists class_points_read on public.class_points;
create policy class_points_read on public.class_points for select using (public.is_admin());
drop policy if exists class_points_write on public.class_points;
create policy class_points_write on public.class_points for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ── Standings ────────────────────────────────────────────────
-- Every scoring class with its team, points and positions. Admins only.
create or replace function public.admin_scoreboard()
returns table (scoring_class text, team_id uuid, team_name text, team_color text, class_points numeric,
               class_position bigint, team_points numeric, team_position bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  return query
  with classes as (
    select distinct coalesce(a.scoring_class, a.class_name) as sc, a.fest_team_id as tid
      from public.class_team_assignments a
  ), pts as (
    select c.sc, c.tid, coalesce((select sum(p.points) from public.class_points p where p.scoring_class = c.sc), 0) as pts
      from classes c
  ), teams as (
    select t.id, t.name, t.color, coalesce(sum(p.pts), 0) as tp
      from public.fest_teams t left join pts p on p.tid = t.id
     group by t.id
  )
  select p.sc, t.id, t.name, t.color, p.pts,
         rank() over (order by p.pts desc),
         t.tp,
         dense_rank() over (order by t.tp desc)
    from pts p join teams t on t.id = p.tid
   order by p.pts desc, p.sc;
end $$;
revoke all on function public.admin_scoreboard() from public, anon;
grant execute on function public.admin_scoreboard() to authenticated;

-- Team positions only (1-4, ties share a place). position is null until any points are recorded.
-- Nothing for the public while the board is switched off; admins always see it.
create or replace function public.get_team_positions()
returns table (team_id uuid, name text, color text, "position" bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_any boolean := exists (select 1 from public.class_points);
begin
  if not coalesce((select leaderboard_public from public.fest_settings limit 1), false) and not public.is_admin() then
    return;
  end if;
  return query
  with tp as (
    select t.id, t.name, t.color, t.display_order,
           coalesce((select sum(p.points)
                       from public.class_points p
                      where p.scoring_class in (select coalesce(a.scoring_class, a.class_name)
                                                  from public.class_team_assignments a
                                                 where a.fest_team_id = t.id)), 0) as pts
      from public.fest_teams t
  )
  select tp.id, tp.name, tp.color,
         case when v_any then rank() over (order by tp.pts desc) end
    from tp
   order by tp.pts desc, tp.display_order;
end $$;
grant execute on function public.get_team_positions() to anon, authenticated;

-- The older board must not hand points to the public either.
create or replace function public.get_team_leaderboard()
returns table (team_id uuid, name text, color text, classes bigint, points numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce((select leaderboard_public from public.fest_settings limit 1), false) and not public.is_admin() then
    return;
  end if;
  return query
  select ft.id, ft.name, ft.color,
         (select count(*) from public.class_team_assignments c where c.fest_team_id = ft.id),
         case when public.is_admin() then
           coalesce((select sum(p.points) from public.class_points p
                      where p.scoring_class in (select coalesce(a.scoring_class, a.class_name)
                                                  from public.class_team_assignments a where a.fest_team_id = ft.id)), 0)
         else 0 end::numeric
  from public.fest_teams ft
  order by ft.display_order, ft.name;
end $$;
