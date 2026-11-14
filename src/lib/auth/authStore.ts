// ── Blossoms sign-in (Supabase email codes) ───────────────────────────────────
// Students: register number + CHRIST email → 6-digit code → the server links that
// email to the register number (claim_student_account). Admins: invited email → code.
// No passwords and no client-side checks that matter: every rule lives in the database.
import { useSyncExternalStore } from 'react'
import { supabase, isSupabaseConfigured, isLocalDatabase } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

export interface StudentProfile {
  id: string
  registerNumber: string
  name: string
  className: string | null
  programme: string | null
  yearOfStudy: number | null
  email: string | null
  phone: string | null
  profileComplete: boolean
  department: string | null
  campus: string | null
}

export interface AdminProfile {
  id: string
  role: UserRole
  fullName: string
  email: string
}

export interface AuthState {
  ready: boolean
  email: string | null
  student: StudentProfile | null
  admin: AdminProfile | null
  /** Set when a signed-in email could not be linked to a student or admin account. */
  linkError: string | null
}

const PENDING_KEY = 'blossoms_pending_claim'
const INITIAL: AuthState = { ready: false, email: null, student: null, admin: null, linkError: null }

let state: AuthState = INITIAL
const listeners = new Set<() => void>()

function setState(next: AuthState) {
  state = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAuthState(): AuthState {
  return state
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getAuthState, getAuthState)
}

interface PendingClaim {
  registerNumber: string
  email: string
}

function readPending(): PendingClaim | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingClaim) : null
  } catch {
    return null
  }
}

function writePending(p: PendingClaim | null) {
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p))
    else localStorage.removeItem(PENDING_KEY)
  } catch {
    // storage unavailable: the claim still works when the code is entered in this tab
  }
}

interface SessionProfileRow {
  email: string | null
  admin: { id: string; role: UserRole; full_name: string; email: string } | null
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
    department: string | null
    campus: string | null
  } | null
}

let refreshing: Promise<AuthState> | null = null
let devSignInTried = false

/**
 * `npm run dev:local` only: sign in automatically as the local dev admin. Needs a development build, a Supabase
 * on this computer (127.0.0.1 / localhost) and VITE_DEV_ADMIN_EMAIL / VITE_DEV_ADMIN_PASSWORD in
 * .env.localdb.local. The live site and `npm run dev` (live database) never do this.
 */
async function signInLocalDevAdmin() {
  const email = import.meta.env.VITE_DEV_ADMIN_EMAIL as string | undefined
  const password = import.meta.env.VITE_DEV_ADMIN_PASSWORD as string | undefined
  if (!import.meta.env.DEV || !isLocalDatabase || !email || !password || devSignInTried) return null
  devSignInTried = true
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) console.warn('Local dev admin sign-in failed:', error.message)
  return data.session ?? null
}

/** Re-reads the signed-in user's student/admin profile from the database. */
export function refreshAuth(): Promise<AuthState> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function doRefresh(): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    setState({ ...INITIAL, ready: true })
    return state
  }

  const { data } = await supabase.auth.getSession()
  let session = data.session
  if (!session) session = await signInLocalDevAdmin()
  if (!session) {
    setState({ ...INITIAL, ready: true })
    return state
  }

  const email = session.user.email?.toLowerCase() ?? null
  let linkError: string | null = null

  // Finish a student sign-in that started on this device.
  const pending = readPending()
  if (pending && email && pending.email.toLowerCase() === email) {
    const { data: claim, error } = await supabase.rpc('claim_student_account', {
      p_register_number: pending.registerNumber,
    })
    const result = claim as { success: boolean; message?: string } | null
    if (error) linkError = error.message
    else if (result && !result.success) linkError = result.message ?? 'Could not link your account.'
    writePending(null)
  }

  await supabase.rpc('ensure_admin_profile')
  const { data: profileData, error: profileError } = await supabase.rpc('get_session_profile')
  if (profileError) {
    setState({ ready: true, email, student: null, admin: null, linkError: profileError.message })
    return state
  }

  const p = profileData as SessionProfileRow
  const student: StudentProfile | null = p.student
    ? {
        id: p.student.id,
        registerNumber: p.student.register_number,
        name: p.student.full_name,
        className: p.student.class_name,
        programme: p.student.programme,
        yearOfStudy: p.student.year_of_study,
        email: p.student.institutional_email,
        phone: p.student.phone,
        profileComplete: p.student.profile_complete,
        department: p.student.department,
        campus: p.student.campus,
      }
    : null
  const admin: AdminProfile | null = p.admin
    ? { id: p.admin.id, role: p.admin.role, fullName: p.admin.full_name, email: p.admin.email }
    : null

  if (!student && !admin && !linkError) {
    linkError = 'This email is not linked to a Blossoms student or admin account.'
  }

  setState({ ready: true, email, student, admin, linkError })
  return state
}

if (isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      // Defer: calling Supabase inside this callback can deadlock the auth client.
      setTimeout(() => void refreshAuth(), 0)
    }
  })
}
void refreshAuth()

// ── Actions ───────────────────────────────────────────────────────────────────

export interface ActionResult {
  ok: boolean
  message?: string
  /** Masked name of the student, shown so they can confirm the register number is theirs. */
  nameHint?: string
}

export function isValidRegisterNumber(value: string): boolean {
  return /^\d{7}$/.test(value.trim())
}

function notConfigured(): ActionResult {
  return { ok: false, message: 'Sign-in is not available: the site is not connected to its database.' }
}

/**
 * Students sign in with their register number only (interim, no email delivery yet).
 * The server creates/returns a placeholder account for the register number
 * (migration 006); the password is derived from the register number, so it is not a
 * secret. Real passwords can replace it later via supabase.auth.updateUser.
 */
export async function signInStudent(registerNumber: string): Promise<AuthState & ActionResult> {
  if (!isSupabaseConfigured) return { ...state, ...notConfigured() }
  const reg = registerNumber.trim()
  writePending(null)

  const { data, error } = await supabase.rpc('student_login_prepare', { p_register_number: reg })
  if (error) return { ...state, ok: false, message: error.message }
  const prep = data as { ok: boolean; message?: string; email?: string }
  if (!prep.ok || !prep.email) return { ...state, ok: false, message: prep.message ?? 'Could not sign in.' }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: prep.email,
    password: `blossoms:${reg}`,
  })
  if (signInError) return { ...state, ok: false, message: friendlyAuthError(signInError.message) }

  const next = await refreshAuth()
  return { ...next, ok: Boolean(next.student), message: next.student ? undefined : next.linkError ?? 'Could not sign in.' }
}

/** Step 1 for admins: email a code to an invited address. */
export async function requestAdminCode(email: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return notConfigured()
  writePending(null)
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/login?role=admin` },
  })
  if (error) return { ok: false, message: friendlyAuthError(error.message) }
  return { ok: true }
}

/** Step 2: verify the code from the email, then link the account. */
export async function verifyEmailCode(email: string, code: string): Promise<AuthState & { ok: boolean; message?: string }> {
  if (!isSupabaseConfigured) return { ...state, ok: false, message: notConfigured().message }
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  })
  if (error) return { ...state, ok: false, message: friendlyAuthError(error.message) }
  const next = await refreshAuth()
  return { ...next, ok: !next.linkError, message: next.linkError ?? undefined }
}

export async function signOut(): Promise<void> {
  writePending(null)
  if (isSupabaseConfigured) await supabase.auth.signOut()
  setState({ ...INITIAL, ready: true })
}

export async function saveProfilePhone(phone: string): Promise<ActionResult> {
  const { data, error } = await supabase.rpc('update_my_profile', { p_phone: phone })
  if (error) return { ok: false, message: error.message }
  const result = data as { success: boolean; message?: string }
  if (!result.success) return { ok: false, message: result.message }
  await refreshAuth()
  return { ok: true }
}

function friendlyAuthError(message: string): string {
  if (/email rate limit/i.test(message)) {
    return 'Login emails are paused for a while because too many were sent in the last hour. Try again later.'
  }
  if (/rate limit|too many|seconds/i.test(message)) {
    return 'Too many code requests. Wait a minute, then try again.'
  }
  if (/expired|invalid/i.test(message)) {
    return 'That code is wrong or has expired. Request a new one.'
  }
  return message
}

// ── Quick checks for components outside React state ──────────────────────────
export function getActiveStudent(): StudentProfile | null {
  return state.student
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super admin',
  content_editor: 'Content editor',
  event_coordinator: 'Event coordinator',
  analyst: 'Analyst',
  student: 'Student',
}
