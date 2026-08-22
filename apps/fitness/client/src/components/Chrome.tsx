/**
 * App chrome: top bar, nav pills, bottom tabs.
 * The app shell is a single full-viewport h-dvh overflow-hidden flex column;
 * this chrome lives in normal flow within it (never fixed), and bar
 * backgrounds stay full-bleed while their contents align to .page-col.
 * Nav is duplicated, not morphed: TabBar (mobile) and NavPills (desktop,
 * in each tab screen's TopBar) have different lifecycles.
 */

import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const CalendarIcon = (
  <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M3 9h18" />
    <path d="M8 4V2.5M16 4V2.5" />
  </svg>
)

const ScaleIcon = (
  <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M12 5v4l2.5-2" />
  </svg>
)

/** Desktop-only nav pills, rendered beside the page title in TopBar. */
export function NavPills() {
  const pillClass = ({ isActive }: { isActive: boolean }) =>
    `text-[12px] font-semibold rounded-full px-3 py-1 transition-colors ${
      isActive ? 'bg-white text-ink border border-line' : 'text-ink-3 hover:text-ink'
    }`

  return (
    <nav className="hidden md:flex items-center gap-0.5 rounded-full bg-chip p-[3px]">
      <NavLink to="/" end className={pillClass}>
        Activities
      </NavLink>
      <NavLink to="/weight" className={pillClass}>
        Weight
      </NavLink>
    </nav>
  )
}

/**
 * Out of this app and back to the host console at the zone root. Must be a
 * plain anchor doing a full cross-document navigation: the console is a
 * different Worker, and a react-router <Link to="/"> would resolve against the
 * router basename and land back on this app's own root. In dev the console's
 * Vite server is on :5173 (strictPort) while this app has its own port.
 */
const HOME_HREF = import.meta.env.DEV ? 'http://localhost:5173/' : '/'

export function HomeButton() {
  return (
    <a
      href={HOME_HREF}
      aria-label="Back to home"
      title="Back to home"
      className="flex-none text-ink-3 hover:text-ink transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-[22px] h-[22px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </a>
  )
}

/**
 * Two-slot sticky header. `home` opts a screen into the leading
 * back-to-console icon — the tab screens use it.
 */
export function TopBar({
  home,
  left,
  right,
}: {
  home?: boolean
  left: ReactNode
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-line px-5 py-4 mb-4">
      <div className="page-col flex justify-between items-center gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {home ? <HomeButton /> : null}
          <div className="min-w-0">{left}</div>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
    </header>
  )
}

/** Mobile bottom tabs — icon + label, mockup style. */
export function TabBar() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-[3px] py-2.5 text-[0.66rem] font-semibold ${
      isActive ? 'text-ink' : 'text-ink-3'
    }`

  return (
    <nav
      className="md:hidden grid grid-cols-2 bg-white border-t border-line pb-[env(safe-area-inset-bottom)] text-center"
      role="tablist"
    >
      <NavLink to="/" end className={tabClass} role="tab">
        {CalendarIcon}
        Activities
      </NavLink>
      <NavLink to="/weight" className={tabClass} role="tab">
        {ScaleIcon}
        Weight
      </NavLink>
    </nav>
  )
}
