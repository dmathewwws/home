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

export function TopBar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-line px-5 py-4 mb-4">
      <div className="page-col flex justify-between items-center gap-3">
        <div>{left}</div>
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
