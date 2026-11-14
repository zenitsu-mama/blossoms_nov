import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-anon-key'

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Treat the .env.example template values as "not configured" so the app
// falls back to mock mode instead of calling a non-existent host.
const isPlaceholder = (v?: string) => !v || /your-project-ref|your-anon-key|placeholder/i.test(v)

export const isSupabaseConfigured = !isPlaceholder(envUrl) && !isPlaceholder(envKey)

/**
 * True when the site talks to a Supabase running on this computer (`npm run dev:local`), i.e. a throwaway copy:
 * nothing done here reaches the live database.
 */
export const isLocalDatabase = (() => {
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(supabaseUrl).hostname)
  } catch {
    return false
  }
})()

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    'ℹ️ Supabase environment variables not detected. Running in mock/offline mode. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to connect to live Supabase.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type { Session, User } from '@supabase/supabase-js'
