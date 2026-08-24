import { NavLink } from 'react-router-dom'

/**
 * Nav is duplicated, not morphed: TabNav is the mobile bottom bar (md:hidden),
 * NavPills the desktop pills in the header row (hidden md:flex).
 *
 * Bottom tab bar: Today (sun) and Logs (journal). Fixed to the viewport but
 * width-locked to the paper shell so it reads as part of the column.
 */
export function TabNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-10 flex
                 border-t border-line backdrop-blur-[10px]
                 pt-[10px] px-2 pb-[calc(12px+env(safe-area-inset-bottom))]"
      style={{ background: 'color-mix(in srgb, var(--color-paper) 88%, white)' }}
    >
      <Tab to="/" label="Today">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
      </Tab>
      <Tab to="/logs" label="Logs">
        <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </Tab>
    </nav>
  )
}

/** Desktop nav: Today/Logs pills beside the HomeButton in the header row. */
export function NavPills() {
  const pillClass = ({ isActive }: { isActive: boolean }) =>
    `font-mono text-[11px] font-semibold tracking-[0.16em] uppercase px-3.5 py-1.5
     rounded-full border transition-colors ${
       isActive
         ? 'bg-select-soft border-select text-ink'
         : 'border-transparent text-muted hover:text-ink'
     }`
  return (
    <nav className="hidden md:flex items-center gap-1.5 ml-auto">
      <NavLink to="/" end className={pillClass}>
        Today
      </NavLink>
      <NavLink to="/logs" className={pillClass}>
        Logs
      </NavLink>
    </nav>
  )
}

function Tab({ to, label, children }: { to: string; label: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      aria-label={label}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-1 font-mono text-[10.5px] font-semibold
         uppercase tracking-[0.16em] ${isActive ? 'text-ink' : 'text-muted'}`
      }
    >
      {({ isActive }) => (
        <>
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
            {children}
          </svg>
          {label}
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: isActive ? 'var(--color-select)' : 'transparent' }}
          />
        </>
      )}
    </NavLink>
  )
}
