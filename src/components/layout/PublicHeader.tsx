import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Menu, X, User, LogOut, ShieldAlert } from 'lucide-react'
import { FloatingPillNavigation, type NavItem } from '@/components/navigation/FloatingPillNavigation'
import { signOut, useAuth } from '@/lib/auth/authStore'
import blossomsLogoUrl from '@/assets/brand/blossoms-2026-27-lockup.webp'
import { StudentTabs, STUDENT_TABS, isStudentTabActive } from './StudentTabs'
import { SHOW_RESULTS } from '@/lib/features'

const NAV_LINKS: NavItem[] = [
  { label: 'Home',         href: '/' },
  { label: 'Events',       href: '/events' },
  { label: 'Schedule',     href: '/schedule' },
  // Always listed: shows "coming soon" until an admin switches the scoreboard on.
  { label: 'Scoreboard',   href: '/scoreboard' },
  { label: 'Results',      href: '/winners' },
  { label: 'Gallery',      href: '/gallery' },
  { label: 'Notice Board', href: '/announcements' },
  { label: 'Meet the Team', href: '/team' },
].filter((link) => SHOW_RESULTS || link.href !== '/winners')

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const auth = useAuth()
  const navLinks = NAV_LINKS
  const student = auth.student
  const admin = Boolean(auth.admin)
  const location = useLocation()
  const navigate = useNavigate()
  const onLoginPage = location.pathname === '/login'

  // The header grows when a student is signed in (tabs, profile banner). Pinned page sections read
  // --site-header-h so they sit below all of it instead of assuming 64px.
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--site-header-h', `${Math.round(bar.getBoundingClientRect().height)}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--site-header-h')
    }
  }, [])

  function handleLogout() {
    void signOut()
  }

  function isLinkActive(href: string): boolean {
    if (href === '/') return location.pathname === '/'
    if (href === '/events') return location.pathname.startsWith('/events')
    if (href === '/winners') return location.pathname.startsWith('/winners') || location.pathname.startsWith('/results')
    if (href === '/announcements') return location.pathname.startsWith('/announcements') || location.pathname.startsWith('/notice-board')
    return location.pathname.startsWith(href)
  }

  return (
    <div ref={barRef} className="sticky top-0 z-50 w-full">
      <header
        className="relative z-10 w-full h-16 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2 select-none bg-[#571f8b] border-b-[2.5px] border-[#0f0f0f]"
      >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FFD43B] focus:text-[#151515] focus:rounded-lg focus:font-semibold">
        Skip to main content
      </a>

      {/* ── Left Section: Brand Identity ─────────────────────────────── */}
      <div className="flex items-center gap-6 shrink-0">
        <Link to="/" className="flex items-center" aria-label="Blossoms 2026–27 home">
          <img
            src={blossomsLogoUrl}
            alt="Blossoms: Be the best, 2026–27"
            className="w-[200px] h-auto drop-shadow-[2px_3px_0_rgba(15,15,15,0.55)]"
            loading="eager"
          />
        </Link>
      </div>

      {/* ── Center Section: Framer-Style Floating Pill Navigation ─────── */}
      <div className="hidden min-[1200px]:flex items-center justify-center flex-1 mx-4">
        <FloatingPillNavigation
          items={navLinks}
          backgroundColor="#FFF8E8"
          textColor="#151515"
          activeBackgroundColor="#FFD43B"
          activeTextColor="#151515"
          padding={4}
          gap={2}
          linkPadding="6px 16px"
        />
      </div>

      {/* ── Right Section: Login / Profile Actions ───────────────────── */}
      <div className="hidden min-[1200px]:flex items-center shrink-0">
        {student ? (
          <div className="flex items-center gap-2">
            <Link
              to="/app/profile"
              className="h-[44px] px-4 rounded-[18px] border-2 border-[#0f0f0f] shadow-comic-sm bg-[#FFD43B] hover:bg-[#FFE066] active:scale-95 text-[#151515] font-semibold text-[14px] flex items-center gap-2 cursor-pointer transition-all duration-150 focus-visible:outline-[#FFD43B] shadow-xs"
            >
              {!onLoginPage && <User className="w-[17px] h-[17px] stroke-[2.4]" />}
              <span>{student.registerNumber}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="h-[44px] w-[44px] rounded-full border-2 border-[#0f0f0f] bg-[#FFF8E8] hover:bg-[#FFD43B] text-[#151515] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-[#FFD43B]"
              aria-label="Log out"
            >
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          </div>
        ) : admin ? (
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="h-[44px] px-4 rounded-full bg-[#151515] hover:bg-black active:scale-95 text-white font-semibold text-[14px] flex items-center gap-2 cursor-pointer transition-all duration-150 focus-visible:outline-[#FFD43B] shadow-xs"
            >
              <ShieldAlert className="w-[17px] h-[17px] text-[#FFD43B] stroke-[2.4]" />
              <span>Admin console</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="h-[44px] w-[44px] rounded-full border-2 border-[#0f0f0f] bg-[#FFF8E8] hover:bg-[#FFD43B] text-[#151515] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-[#FFD43B]"
              aria-label="Log out"
            >
              <LogOut className="w-[17px] h-[17px]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="h-[36px] px-4 rounded-[18px] border-2 border-[#0f0f0f] shadow-comic-sm bg-[#FFD43B] hover:bg-[#FFE066] active:scale-95 text-[#151515] font-semibold text-[13.5px] flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-150 focus-visible:outline-[#FFD43B] shadow-xs"
            aria-label="User Login"
          >
            <span>Login</span>
            {!onLoginPage && <User className="w-[15px] h-[15px] stroke-[2.4]" aria-hidden="true" />}
          </button>
        )}
      </div>

      {/* ── Mobile View: Hamburger and Login ─────────────────────────── */}
      <div className="flex min-[1200px]:hidden items-center gap-2">
        {!student && !admin && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="h-[36px] px-3 rounded-[18px] border-2 border-[#0f0f0f] bg-[#FFD43B] text-[#151515] font-semibold text-[13px] flex items-center gap-1.5 cursor-pointer"
            aria-label="User Login"
          >
            <span className={onLoginPage ? undefined : 'hidden min-[400px]:inline'}>Login</span>
            {!onLoginPage && <User className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        )}
        <button
          className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full border-2 border-[#0f0f0f] bg-[#FFF8E8] text-[#151515] hover:bg-[#FFD43B] active:scale-90 transition-all duration-100 cursor-pointer focus-visible:outline-[#FFD43B] touch-manipulation"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      </header>
      <StudentTabs />

      {/* ── Mobile Drawer Navigation ─────────────────────────────────── */}
      {menuOpen && (
        <div
          id="mobile-nav-drawer"
          className="min-[1200px]:hidden fixed inset-x-0 top-16 bottom-0 z-[100] bg-[#FFF8E8] flex flex-col p-6 overflow-y-auto"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href)
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-5 py-3 rounded-[18px] border-2 border-[#0f0f0f] text-[17px] font-[500] transition-all duration-100 active:scale-[0.98] active:bg-[#FFD43B] touch-manipulation cursor-pointer ${
                    active
                      ? 'bg-primary text-white font-semibold'
                      : 'bg-white text-[#151515] hover:bg-[#FFD43B]'
                  }`}
                >
                  <span>{link.label}</span>
                  <span className="text-sm opacity-60">→</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-black/10 space-y-3">
            {student ? (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#151515]/60 px-1">Signed in · {student.registerNumber}</p>
                {STUDENT_TABS.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    to={href}
                    onClick={() => setMenuOpen(false)}
                    className={`w-full h-[46px] rounded-full border-2 border-[#0f0f0f] font-semibold flex items-center justify-center gap-2 ${
                      isStudentTabActive(href, location.pathname) ? 'bg-[#FFD43B] text-[#151515]' : 'bg-white text-[#151515]'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full h-[42px] rounded-full bg-[#F5EBD4] text-[#151515] font-medium flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            ) : admin ? (
              <div className="space-y-2">
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="w-full h-[46px] rounded-full bg-[#151515] text-white font-semibold flex items-center justify-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-[#FFD43B]" />
                  <span>Developer Admin Console</span>
                </Link>
                <button
                  type="button"
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full h-[42px] rounded-full bg-[#F5EBD4] text-[#151515] font-medium flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { navigate('/login'); setMenuOpen(false); }}
                className="w-full h-[46px] rounded-full bg-[#FFD43B] text-[#151515] font-semibold flex items-center justify-center gap-2"
              >
                {!onLoginPage && <User className="w-4 h-4" />}
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default PublicHeader
