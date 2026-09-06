/**
 * "What did you do?" quick-log card: eight tappable activity chips that upsert
 * one day's log immediately. The day is whichever the calendar has selected,
 * defaulting to today. Optimistic — the chip flips at once and the resulting
 * `activity-logged` broadcast refetches the calendar so that day's tile
 * recolors live; on API failure the chip reverts.
 */

import { useEffect, useRef, useState } from 'react'
import { ACTIVITIES, type ActivityKey } from '../lib/activities'
import { logActivities } from '../lib/api'
import { formatLong, todayKey } from '../lib/dates'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { useDayLog } from '../hooks/useAppData'

const sameSet = (a: ActivityKey[], b: ActivityKey[]) =>
  a.length === b.length && a.every((k, i) => k === b[i])

interface QuickLogProps {
  /** Date key being edited — the calendar's selected day, or today. */
  date: string
  onBackToToday: () => void
}

export function QuickLog({ date, onBackToToday }: QuickLogProps) {
  const { getProfileJwt } = useLocalFirstAuth()
  const { activities, loaded } = useDayLog(date)
  // Optimistic override, scoped to the day it was made on so switching days
  // can never show another day's chips.
  const [pending, setPending] = useState<{ date: string; acts: ActivityKey[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const isToday = date === todayKey()

  const selected = pending?.date === date ? pending.acts : activities

  // Once the server echoes our write back, drop the override so another
  // device's later change isn't masked indefinitely.
  useEffect(() => {
    if (pending && pending.date === date && sameSet(pending.acts, activities)) setPending(null)
  }, [pending, date, activities])

  // Mobile puts this card below the calendar, so bring it into view when a
  // past day is tapped. Skips the initial mount (today needs no scroll).
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current && !isToday) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    mounted.current = true
  }, [date, isToday])

  const toggle = async (key: ActivityKey) => {
    const prev = selected
    // Preserve the canonical catalog order so tile split colors are stable
    const next = prev.includes(key)
      ? prev.filter((k) => k !== key)
      : ACTIVITIES.filter((a) => prev.includes(a.key) || a.key === key).map((a) => a.key)
    setPending({ date, acts: next })
    setError(null)
    try {
      await logActivities(getProfileJwt, date, next)
    } catch (err) {
      setPending(null)
      setError(err instanceof Error ? err.message : 'Could not save — try again')
    }
  }

  return (
    <section ref={sectionRef} className="card mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="eyebrow mb-0.5">{isToday ? 'Today' : formatLong(date)}</div>
          <div className="font-display text-[18px] font-bold tracking-tight">
            What did you do?
          </div>
        </div>
        {!isToday && (
          <button
            type="button"
            onClick={onBackToToday}
            className="flex-none rounded-full border border-line-btn bg-white px-3 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            Today
          </button>
        )}
      </div>
      <div className={`flex flex-wrap gap-2 ${loaded ? '' : 'opacity-60'}`}>
        {ACTIVITIES.map((a) => {
          const on = selected.includes(a.key)
          return (
            <button
              key={a.key}
              type="button"
              disabled={!loaded}
              aria-pressed={on}
              onClick={() => toggle(a.key)}
              style={
                on
                  ? { background: `color-mix(in srgb, ${a.color} 14%, #fff)`, borderColor: a.color }
                  : undefined
              }
              className="flex items-center gap-[7px] rounded-full border-[1.5px] border-line-btn bg-white py-1.5 pl-3 pr-3.5 text-[13px] font-medium text-ink transition-colors active:scale-[.97]"
            >
              <span className="w-[9px] h-[9px] rounded-full flex-none" style={{ background: a.color }} />
              {a.name}
              {on && (
                <span className="text-[0.72rem] font-bold" style={{ color: a.color }}>
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-2.5 text-[11px] text-ink-3">
        {isToday
          ? "Tap to log — today's tile updates on the calendar above."
          : 'Editing a past day — tap Today to go back.'}
      </div>
      {error && <div className="mt-2 text-[0.78rem] text-down">{error}</div>}
    </section>
  )
}
