/**
 * Phone-frame chrome: top bar, bottom tabs, FAB, add sheet, save bar.
 * The mockup positioned these fixed to the viewport; inside the desktop
 * two-column layout that breaks, so the phone frame is a h-dvh flex column
 * and these live in normal flow / absolute within it.
 */

import { type ReactNode, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export function TopBar({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 px-5 pt-6 pb-3.5 bg-gradient-to-b from-kraft from-[78%] to-transparent">
      <div className="flex justify-between items-end gap-3">
        <div>{left}</div>
        {right ? <div className="pb-1">{right}</div> : null}
      </div>
    </header>
  )
}

export function BackButton({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="font-mono2 text-[11px] tracking-[0.12em] uppercase text-muted"
    >
      &larr; {label}
    </button>
  )
}

export function TabBar() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-[15px] pb-[17px] font-mono2 text-[10.5px] tracking-[0.16em] uppercase ${
      isActive ? 'text-ink' : 'text-muted'
    }`
  const indicator = (isActive: boolean) =>
    isActive ? <span className="absolute -top-0.5 left-[22%] right-[22%] h-1 bg-yolk" /> : null

  return (
    <nav className="grid grid-cols-2 bg-kraft border-t-2 border-ink pb-[env(safe-area-inset-bottom)] text-center" role="tablist">
      <NavLink to="/" end className={tabClass} role="tab">
        {({ isActive }) => (
          <>
            {indicator(isActive)}
            Recipes
          </>
        )}
      </NavLink>
      <NavLink to="/reflections" className={tabClass} role="tab">
        {({ isActive }) => (
          <>
            {indicator(isActive)}
            Reflections
          </>
        )}
      </NavLink>
    </nav>
  )
}

export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute z-[56] right-[18px] bottom-[calc(78px+env(safe-area-inset-bottom))] w-[60px] h-[60px] bg-yolk text-ink border-2 border-ink rounded-full grid place-items-center shadow-[3px_4px_0_var(--color-ink)] transition-[transform,box-shadow] duration-150 active:translate-x-[3px] active:translate-y-[4px] active:shadow-none"
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}

interface AddSheetProps {
  open: boolean
  onClose: () => void
}

/** Bottom sheet: "Paste a video link" and "Type it out" as peers. */
export function AddSheet({ open, onClose }: AddSheetProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <>
      <div
        className={`absolute inset-0 z-[57] bg-backdrop transition-opacity duration-200 ${
          open ? 'opacity-55 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Add a recipe"
        aria-hidden={!open}
        className={`absolute z-[58] bottom-0 inset-x-0 bg-kraft border-t-2 border-ink px-5 pt-2.5 pb-[calc(18px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-[cubic-bezier(.2,.8,.3,1)] ${
          open ? 'translate-y-0' : 'translate-y-[102%]'
        }`}
      >
        <div className="w-[46px] h-1 bg-rule mx-auto mt-1 mb-4" />
        <span className="tape mb-1.5">Add a recipe</span>

        <button
          type="button"
          onClick={() => go('/add/paste')}
          className="flex items-center gap-3.5 w-full text-left py-4 px-0.5 border-b border-rule"
        >
          <span className="w-[42px] h-[42px] flex-none border-[1.5px] border-ink block" aria-hidden>
            <svg viewBox="0 0 100 100" className="block w-full h-full">
              <rect width="100" height="100" fill="#9C3B14" />
              <path d="M40 32l30 18-30 18z" fill="#E0D0B0" />
            </svg>
          </span>
          <span className="flex-1">
            <b className="font-display font-semibold text-[16.5px] block tracking-[-0.01em]">Paste a video link</b>
            <em className="font-mono2 not-italic text-[10px] tracking-[0.09em] uppercase text-muted block mt-1 leading-[1.4]">
              Youtube &middot; broken into cards
            </em>
          </span>
          <span className="font-mono2 text-muted">&rarr;</span>
        </button>

        <button
          type="button"
          onClick={() => go('/add/manual')}
          className="flex items-center gap-3.5 w-full text-left py-4 px-0.5"
        >
          <span className="w-[42px] h-[42px] flex-none border-[1.5px] border-ink block" aria-hidden>
            <svg viewBox="0 0 100 100" className="block w-full h-full">
              <rect width="100" height="100" fill="#2E5C8A" />
              <path d="M30 70l6-16 26-26 10 10-26 26z" fill="#E0D0B0" />
              <path d="M28 76h44" stroke="#E0D0B0" strokeWidth="5" />
            </svg>
          </span>
          <span className="flex-1">
            <b className="font-display font-semibold text-[16.5px] block tracking-[-0.01em]">Type it out</b>
            <em className="font-mono2 not-italic text-[10px] tracking-[0.09em] uppercase text-muted block mt-1 leading-[1.4]">
              Your own, or off a page &middot; pick ingredients as you go
            </em>
          </span>
          <span className="font-mono2 text-muted">&rarr;</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full pt-3.5 pb-0.5 text-center font-mono2 text-[11px] tracking-[0.16em] uppercase text-muted"
        >
          Not now
        </button>
      </div>
    </>
  )
}

interface SaveBarProps {
  label: string
  onClick: () => void
  disabled?: boolean
}

export function SaveBar({ label, onClick, disabled }: SaveBarProps) {
  return (
    <div className="bg-kraft border-t-2 border-ink px-5 py-[13px] pb-[calc(13px+env(safe-area-inset-bottom))]">
      <button type="button" className="save-btn" onClick={onClick} disabled={disabled}>
        {label}
      </button>
    </div>
  )
}
