-- Points, class positions and team positions are for super admins only. Other admins (coordinators,
-- content editors) see the public scoreboard like everyone else: "coming soon" while it is switched off.

drop policy if exists class_points_read on public.class_points;
create policy class_points_read on public.class_points for select using (public.is_super_admin());

create or replace function public.admin_scoreboard()
returns table (scoring_class text, team_id uuid, team_name text, team_color text, class_points numeric,
               class_position bigint, team_points numeric, team_position bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
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

create or replace function public.get_team_positions()
returns table (team_id uuid, name text, color text, "position" bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_any boolean := exists (select 1 from public.class_points);
begin
  if not coalesce((select leaderboard_public from public.fest_settings limit 1), false) and not public.is_super_admin() then
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

create or replace function public.get_team_leaderboard()
returns table (team_id uuid, name text, color text, classes bigint, points numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce((select leaderboard_public from public.fest_settings limit 1), false) and not public.is_super_admin() then
    return;
  end if;
  return query
  select ft.id, ft.name, ft.color,
         (select count(*) from public.class_team_assignments c where c.fest_team_id = ft.id),
         case when public.is_super_admin() then
           coalesce((select sum(p.points) from public.class_points p
                      where p.scoring_class in (select coalesce(a.scoring_class, a.class_name)
                                                  from public.class_team_assignments a where a.fest_team_id = ft.id)), 0)
         else 0 end::numeric
  from public.fest_teams ft
  order by ft.display_order, ft.name;
end $$;
