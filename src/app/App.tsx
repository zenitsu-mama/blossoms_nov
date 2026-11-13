import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { ConfirmHost } from '@/components/ui/ConfirmDialog'

// Layouts
import { PublicShell }  from '@/components/layout/PublicShell'
import { StudentShell } from '@/components/layout/StudentShell'
import { AdminShell }   from '@/components/layout/AdminShell'
import { Skeleton }     from '@/components/ui/Skeleton'

// Core Public pages (eagerly imported for instantaneous 0ms nav bar clicks)
import HomePage          from '@/features/public/HomePage'
import EventsPage        from '@/features/events/EventsPage'
import EventDetailPage   from '@/features/events/EventDetailPage'
import SchedulePage      from '@/features/schedule/SchedulePage'
import AnnouncementsPage from '@/features/announcements/AnnouncementsPage'
import GalleryPage       from '@/features/gallery/GalleryPage'
import WinnersPage       from '@/features/winners/WinnersPage'
import { SHOW_RESULTS }  from '@/lib/features'
import TeamPage          from '@/features/public/TeamPage'
import LoginPage         from '@/features/auth/LoginPage'
import { getCategories } from '@/lib/api/events'
import { getAnnouncements } from '@/lib/api/announcements'

const DesignSystemPage    = lazy(() => import('@/features/public/DesignSystemPage'))

// Student pages (lazy loaded)
const StudentDashboard    = lazy(() => import('@/features/student/StudentDashboard'))
const MyEventsPage        = lazy(() => import('@/features/student/MyEventsPage'))
const ProfilePage         = lazy(() => import('@/features/student/ProfilePage'))
const StudentTeamPage     = lazy(() => import('@/features/student/TeamPage'))

// Admin pages (lazy loaded)
const AdminOverview       = lazy(() => import('@/features/admin/AdminOverview'))
const AdminEventsPage     = lazy(() => import('@/features/admin/AdminEventsPage'))
const AdminEventEditor    = lazy(() => import('@/features/admin/AdminEventEditor'))
const AdminSchedulePage   = lazy(() => import('@/features/admin/AdminSchedulePage'))
const AdminRegistrations  = lazy(() => import('@/features/admin/AdminRegistrations'))
const AdminStudents       = lazy(() => import('@/features/admin/AdminStudents'))
const AdminCoordinators   = lazy(() => import('@/features/admin/AdminCoordinators'))
const AdminAnnouncements  = lazy(() => import('@/features/admin/AdminAnnouncements'))
const AdminAttendance     = lazy(() => import('@/features/admin/AdminAttendance'))
const AdminDefaulters     = lazy(() => import('@/features/admin/AdminDefaulters'))
const AdminExports        = lazy(() => import('@/features/admin/AdminExports'))
const AdminWinners        = lazy(() => import('@/features/admin/AdminWinners'))
const AdminAudit          = lazy(() => import('@/features/admin/AdminAudit'))
const AdminPointsTeams    = lazy(() => import('@/features/admin/AdminPointsTeams'))

// After any save succeeds (attendance, event edits, winners, …) every loaded list is refetched, so other pages
// never show data from before the save. Lists on screen refetch now; the rest refetch when next opened.
const queryClient: QueryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries()
    },
  }),
  defaultOptions: {
    queries: {
      // Data from other people's changes (e.g. attendance marked by a coordinator) shows within a minute.
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
})

/**
 * Once the first screen has painted and the browser is idle, warm the data for the
 * public pages so Notice Board / Events open without a loading skeleton.
 */
function usePrefetchPublicData() {
  useEffect(() => {
    const run = () => {
      queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: getCategories })
      queryClient.prefetchQuery({ queryKey: ['announcements'], queryFn: getAnnouncements })
    }
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = idle(run)
    return () => cancel(id)
  }, [])
}

function PageFallback() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export default function App() {
  usePrefetchPublicData()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* ── Home route (Authentic Figma Modern Mobile Interface Design) ── */}
            <Route path="/" element={<HomePage />} />

            {/* ── Public routes ─────────────────────────────── */}
            <Route element={<PublicShell />}>
              <Route path="events" element={<EventsPage />} />
              <Route path="events/:slug" element={<EventDetailPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="contact" element={<Navigate to="/" replace />} />
              <Route path="about" element={<Navigate to="/" replace />} />
              <Route path="gallery" element={<GalleryPage />} />
              {/* Results is hidden on the live site while it is being built (see lib/features.ts). */}
              <Route path="winners" element={SHOW_RESULTS ? <WinnersPage /> : <Navigate to="/" replace />} />
              <Route path="results" element={<Navigate to={SHOW_RESULTS ? '/winners' : '/'} replace />} />
              <Route path="notice-board" element={<Navigate to="/announcements" replace />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="design-system" element={<DesignSystemPage />} />

              {/* ── Student pages (sign-in required): same header, plus student tabs ── */}
              <Route path="app" element={<StudentShell />}>
                <Route index element={<StudentDashboard />} />
                <Route path="events" element={<Navigate to="/events" replace />} />
                <Route path="my-events" element={<MyEventsPage />} />
                <Route path="schedule" element={<Navigate to="/app/my-events" replace />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="teams/:teamId" element={<StudentTeamPage />} />
              </Route>
            </Route>

            {/* ── Admin routes (auth + role required) ───────── */}
            <Route path="admin" element={<AdminShell />}>
              <Route index element={<AdminOverview />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="events/new" element={<Navigate to="/admin/events" replace />} />
              <Route path="events/:id" element={<AdminEventEditor />} />
              <Route path="schedule" element={<AdminSchedulePage />} />
              <Route path="registrations" element={<AdminRegistrations />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="points" element={<AdminPointsTeams />} />
              <Route path="coordinators" element={<AdminCoordinators />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="defaulters" element={<AdminDefaulters />} />
              <Route path="exports" element={<AdminExports />} />
              <Route path="winners" element={<AdminWinners />} />
              <Route path="content" element={<Navigate to="/admin/winners" replace />} />
              <Route path="audit" element={<AdminAudit />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <ConfirmHost />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            border: '2px solid #151515',
            borderRadius: '12px',
            fontFamily: 'var(--font-body)',
            boxShadow: '3px 3px 0px 0px #151515',
          },
        }}
      />
    </QueryClientProvider>
  )
}
