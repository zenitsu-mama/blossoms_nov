// Admin data access. Permissions are enforced in the database (RLS + checks inside each
// function); a non-admin calling these gets an error, not data.
import { supabase } from '@/lib/supabase/client'
import type { Announcement, AnnouncementSeverity, Event, RecapPanel, UserRole, WeeklyRecap } from '@/types'

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totals: {
    students: number
    accounts_linked: number
    profiles_complete: number
    registrations: number
    students_registered: number
    teams: number
    attendance_marked: number
    students_present: number
    events: number
    students_completed: number
  }
  rules: { min_chosen: number; mandatory_total: number; mandatory_held: number }
  by_category: { category: string; slug: string; registrations: number; present: number }[]
  by_event: {
    event_id: string
    slug: string
    title: string
    category: string
    event_format: string
    event_date: string | null
    is_mandatory: boolean
    registration_closed: boolean
    registration_enabled: boolean
    registrations: number
    teams: number
    present: number
    absent: number
  }[]
  by_class: { class_name: string; students: number; linked: number; registered: number; attended: number; completed: number }[]
}

export const getDashboardStats = () => rpc<DashboardStats>('admin_dashboard_stats')

// ── Attendance ────────────────────────────────────────────────────────────────
export interface RosterRow {
  registration_id: string
  student_id: string
  register_number: string
  full_name: string
  class_name: string | null
  phone: string | null
  registration_status: string
  registered_at: string
  team_id: string | null
  team_name: string | null
  is_leader: boolean | null
  /** Chosen session for events held more than once. */
  slot_id: string | null
  session_starts_at: string | null
  attendance_status: 'present' | 'absent' | null
  marked_at: string | null
}

export const getEventRoster = (eventId: string) => rpc<RosterRow[]>('admin_event_roster', { p_event_id: eventId })

export interface SpotEntry {
  register_number: string
  /** Only needed when the student has no phone number on file; saved to their profile. */
  phone?: string
}

/**
 * On-spot registration at the venue: registers the students (as one team when a team name is given) and marks
 * them present. Skips the deadline, seat limit, clashes and team size; needs a phone number for everyone.
 */
export const spotRegister = (eventId: string, entries: SpotEntry[], teamName?: string | null, slotId?: string | null) =>
  rpc<{ success: boolean; message: string; error_code?: string; count?: number }>('admin_spot_register', {
    p_event_id: eventId,
    p_entries: entries,
    p_team_name: teamName || null,
    p_slot_id: slotId || null,
  })

export const markAttendance = (eventId: string, studentIds: string[], status: 'present' | 'absent' | 'clear') =>
  rpc<{ success: boolean; updated: number }>('admin_mark_attendance', {
    p_event_id: eventId,
    p_student_ids: studentIds,
    p_status: status,
  })

// ── Defaulters ────────────────────────────────────────────────────────────────
export type DefaulterKind = 'below_minimum' | 'registered_not_attended' | 'attended_none' | 'registered_none'

export interface DefaulterRow {
  student_id: string
  register_number: string
  full_name: string
  class_name: string | null
  phone: string | null
  registered_count: number
  attended_count: number
  missed_events: string | null
}

export const getDefaulters = (kind: DefaulterKind, className?: string | null) =>
  rpc<DefaulterRow[]>('admin_defaulters', { p_kind: kind, p_class: className || null })

// ── Exports ───────────────────────────────────────────────────────────────────
export interface ParticipationRow {
  event_title: string
  category: string
  event_date: string | null
  register_number: string
  full_name: string
  class_name: string | null
  phone: string | null
  team_name: string | null
  is_leader: boolean
  registration_status: string
  registered_at: string
  attendance_status: string | null
  marked_at: string | null
}

export const getParticipationRows = () => rpc<ParticipationRow[]>('admin_participation_rows')

// ── Students ──────────────────────────────────────────────────────────────────
export interface AdminStudentRow {
  student_id: string
  register_number: string
  full_name: string
  class_name: string | null
  phone: string | null
  institutional_email: string | null
  linked: boolean
  profile_complete: boolean
  registered_count: number
  attended_count: number
}

export const searchStudentsAdmin = (query: string, className: string | null, limit = 100) =>
  rpc<AdminStudentRow[]>('admin_search_students', { p_query: query || null, p_class: className, p_limit: limit })

export interface StudentDetail {
  student: {
    id: string
    register_number: string
    full_name: string
    class_name: string | null
    programme: string | null
    year_of_study: number | null
    institutional_email: string | null
    phone: string | null
    profile_complete: boolean
    is_verified: boolean
  }
  linked: boolean
  registrations: {
    event_title: string
    event_id: string
    registration_status: string
    registered_at: string
    team_name: string | null
    attendance_status: string | null
  }[]
}

export const getStudentDetail = (id: string) => rpc<StudentDetail>('admin_student_detail', { p_student_id: id })

export interface ClassRow {
  class_name: string
  programme: string | null
  year_of_study: number | null
  team_name: string | null
  students: number
  linked: number
  registered: number
  attended: number
  completed: number
}

export const getClassList = () => rpc<ClassRow[]>('admin_class_list')

export const setStudentEmail = (studentId: string, email: string | null, unlink: boolean) =>
  rpc<{ success: boolean; message?: string }>('admin_set_student_email', {
    p_student_id: studentId,
    p_email: email,
    p_unlink: unlink,
  })

// ── Events ────────────────────────────────────────────────────────────────────
export type EventPatch = Partial<
  Pick<
    Event,
    | 'title'
    | 'description'
    | 'rules_markdown'
    | 'status'
    | 'registration_closed'
    | 'registration_enabled'
    | 'registration_opens_at'
    | 'registration_closes_at'
    | 'whatsapp_group_url'
    | 'min_team_size'
    | 'max_team_size'
    | 'capacity'
    | 'waitlist_enabled'
    | 'cancellation_allowed'
    | 'is_mandatory'
  >
>

export async function updateEvent(id: string, patch: EventPatch): Promise<void> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw new Error(error.message)
  // The database skips rows the admin may not edit without raising an error, so check something was saved.
  if (!data || data.length === 0) throw new Error('Not saved: you do not have permission to edit this event.')
}

// ── Sessions (date, time, venue) ─────────────────────────────────────────────
export interface SlotInput {
  slotId: string | null // null adds a new session
  date: string // 'YYYY-MM-DD'
  start: string | null // 'HH:MM' in IST, or null for timing TBA
  end: string | null
  venue: string | null // venue name; a new name is added to the venue list
  notify: boolean // tell registered students if the date, start or venue changed
}
type SlotResult = { success: boolean; message: string; error_code?: string; slot_id?: string; notified?: number }

export const saveEventSlot = (eventId: string, s: SlotInput) =>
  rpc<SlotResult>('admin_save_event_slot', {
    p_event_id: eventId,
    p_slot_id: s.slotId,
    p_date: s.date,
    p_start: s.start || null,
    p_end: s.end || null,
    p_venue: s.venue?.trim() || null,
    p_notify: s.notify,
  })

export const deleteEventSlot = (slotId: string) => rpc<SlotResult>('admin_delete_event_slot', { p_slot_id: slotId })

export async function getVenueNames(): Promise<string[]> {
  const { data, error } = await supabase.from('venues').select('name').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((v) => v.name as string)
}

// ── Winners ───────────────────────────────────────────────────────────────────
export interface Entrant {
  kind: 'team' | 'student'
  team_id?: string
  student_id?: string
  label: string
  detail: string | null
}

export const getEventEntrants = (eventId: string) => rpc<Entrant[]>('admin_event_entrants', { p_event_id: eventId })

export interface WinnerRow {
  id: string
  event_id: string
  position: number
  student_id: string | null
  team_id: string | null
  description: string | null
}

export async function getWinnersForEvent(eventId: string): Promise<WinnerRow[]> {
  const { data, error } = await supabase
    .from('event_winners')
    .select('id, event_id, position, student_id, team_id, description')
    .eq('event_id', eventId)
    .order('position')
  if (error) throw new Error(error.message)
  return (data ?? []) as WinnerRow[]
}

export const setWinners = (
  eventId: string,
  winners: { position: number; student_id?: string; team_id?: string; description?: string }[],
  notify = true
) => rpc<{ success: boolean; count: number }>('admin_set_winners', { p_event_id: eventId, p_winners: winners, p_notify: notify })

// ── Announcements & notifications ─────────────────────────────────────────────
export async function listAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Announcement[]
}

export interface AnnouncementInput {
  title: string
  body: string
  severity: AnnouncementSeverity
  is_pinned: boolean
  is_published: boolean
}

export async function saveAnnouncement(input: AnnouncementInput, id?: string, createdBy?: string): Promise<void> {
  const row = { ...input, updated_at: new Date().toISOString(), publish_at: input.is_published ? new Date().toISOString() : null }
  const { error } = id
    ? await supabase.from('announcements').update(row).eq('id', id)
    : await supabase.from('announcements').insert({ ...row, created_by: createdBy ?? null })
  if (error) throw new Error(error.message)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Weekly recaps (comic strips) ──────────────────────────────────────────────
export async function listAllRecaps(): Promise<WeeklyRecap[]> {
  const { data, error } = await supabase.from('weekly_recaps').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as WeeklyRecap[]
}

export interface RecapInput {
  week_label: string
  title: string
  panels: RecapPanel[]
  is_published: boolean
}

export async function saveRecap(input: RecapInput, id?: string, createdBy?: string): Promise<void> {
  const row = { ...input, updated_at: new Date().toISOString(), published_at: input.is_published ? new Date().toISOString() : null }
  const { error } = id
    ? await supabase.from('weekly_recaps').update(row).eq('id', id)
    : await supabase.from('weekly_recaps').insert({ ...row, created_by: createdBy ?? null })
  if (error) throw new Error(error.message)
}

export async function deleteRecap(id: string): Promise<void> {
  const { error } = await supabase.from('weekly_recaps').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface NotificationInput {
  title: string
  body: string
  link?: string | null
  audience: 'all' | 'event'
  event_id?: string | null
}

export async function sendNotification(input: NotificationInput, createdBy: string): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    title: input.title,
    body: input.body,
    link: input.link || null,
    audience: input.audience,
    event_id: input.audience === 'event' ? input.event_id : null,
    created_by: createdBy,
  })
  if (error) throw new Error(error.message)
}

/** Edits a sent notification's wording. Students see the change; who it went to stays the same. */
export async function updateNotification(id: string, patch: { title: string; body: string; link: string | null }): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ title: patch.title.trim(), body: patch.body.trim(), link: patch.link || null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export interface SentNotification {
  id: string
  title: string
  body: string
  link: string | null
  audience: string
  event_id: string | null
  student_id: string | null
  created_at: string
}

export async function listSentNotifications(limit = 50): Promise<SentNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, link, audience, event_id, student_id, created_at')
    .neq('audience', 'student')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as SentNotification[]
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Admin accounts ────────────────────────────────────────────────────────────
export interface AdminInvite {
  email: string
  full_name: string
  role: UserRole
  created_at: string
  claimed_at: string | null
}

export interface AdminAccount {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export async function listAdmins(): Promise<{ invites: AdminInvite[]; accounts: AdminAccount[] }> {
  const [inv, acc] = await Promise.all([
    supabase.from('admin_invites').select('*').order('created_at'),
    supabase.from('admin_profiles').select('id, email, full_name, role, is_active, created_at').order('created_at'),
  ])
  if (inv.error) throw new Error(inv.error.message)
  if (acc.error) throw new Error(acc.error.message)
  return { invites: (inv.data ?? []) as AdminInvite[], accounts: (acc.data ?? []) as AdminAccount[] }
}

export async function inviteAdmin(email: string, fullName: string, role: UserRole, invitedBy: string): Promise<void> {
  const { error } = await supabase
    .from('admin_invites')
    .upsert({ email: email.trim().toLowerCase(), full_name: fullName.trim(), role, invited_by: invitedBy })
  if (error) throw new Error(error.message)
}

export async function removeInvite(email: string): Promise<void> {
  const { error } = await supabase.from('admin_invites').delete().eq('email', email)
  if (error) throw new Error(error.message)
}

export async function setAdminActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('admin_profiles').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setAdminRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('admin_profiles').update({ role }).eq('id', id)
  if (error) throw new Error(error.message)
}

export interface CoordinatorAssignment {
  id: string
  event_id: string
  admin_profile_id: string
}

export async function listAssignments(): Promise<CoordinatorAssignment[]> {
  const { data, error } = await supabase.from('event_coordinator_assignments').select('id, event_id, admin_profile_id')
  if (error) throw new Error(error.message)
  return (data ?? []) as CoordinatorAssignment[]
}

export async function assignCoordinator(eventId: string, adminProfileId: string): Promise<void> {
  const { error } = await supabase
    .from('event_coordinator_assignments')
    .insert({ event_id: eventId, admin_profile_id: adminProfileId })
  if (error) throw new Error(error.message)
}

export async function unassignCoordinator(id: string): Promise<void> {
  const { error } = await supabase.from('event_coordinator_assignments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export interface ClassRep {
  id: string
  full_name: string
  register_number: string | null
  class_name: string
  phone: string | null
}

export async function listClassReps(): Promise<ClassRep[]> {
  const { data, error } = await supabase.from('class_representatives').select('*').order('class_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ClassRep[]
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditRow {
  id: string
  actor_id: string | null
  actor_role: string | null
  action: string
  resource: string | null
  resource_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
}

export async function listAuditLogs(limit = 200): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as AuditRow[]
}

// ── Participation rules and fest teams ────────────────────────────────────────
export interface FestSettings {
  min_chosen_events: number
  leaderboard_public: boolean
}

export async function getFestSettings(): Promise<FestSettings> {
  const { data, error } = await supabase.from('fest_settings').select('min_chosen_events, leaderboard_public').single()
  if (error) throw new Error(error.message)
  return data as FestSettings
}

export async function updateFestSettings(patch: FestSettings, updatedBy?: string): Promise<void> {
  const { error } = await supabase
    .from('fest_settings')
    .update({ ...patch, updated_by: updatedBy ?? null, updated_at: new Date().toISOString() })
    .eq('id', true)
  if (error) throw new Error(error.message)
}

export interface FestTeam {
  id: string
  name: string
  color: string
  display_order: number
}

export async function listFestTeams(): Promise<FestTeam[]> {
  const { data, error } = await supabase.from('fest_teams').select('id, name, color, display_order').order('display_order').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as FestTeam[]
}

export async function saveFestTeam(input: Omit<FestTeam, 'id'>, id?: string): Promise<void> {
  const { error } = id ? await supabase.from('fest_teams').update(input).eq('id', id) : await supabase.from('fest_teams').insert(input)
  if (error) throw new Error(error.message)
}

export async function deleteFestTeam(id: string): Promise<void> {
  const { error } = await supabase.from('fest_teams').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listClassTeams(): Promise<{ class_name: string; fest_team_id: string }[]> {
  const { data, error } = await supabase.from('class_team_assignments').select('class_name, fest_team_id')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Put a class in a team, or take it out with teamId = null. */
export async function setClassTeam(className: string, teamId: string | null): Promise<void> {
  const { error } = teamId
    ? await supabase.from('class_team_assignments').upsert({ class_name: className, fest_team_id: teamId, assigned_at: new Date().toISOString() })
    : await supabase.from('class_team_assignments').delete().eq('class_name', className)
  if (error) throw new Error(error.message)
}

export interface TeamStanding {
  team_id: string
  name: string
  color: string
  classes: number
  points: number
}

/** Empty for the public until an admin switches the standings on. */
export const getTeamLeaderboard = () => rpc<TeamStanding[]>('get_team_leaderboard')
