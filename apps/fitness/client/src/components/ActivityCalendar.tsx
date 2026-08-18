/**
 * The 3-month activity calendar card. Desktop shows the whole window as three
 * months side-by-side (status-page style); mobile shows one month at a time
 * with ‹ › nav stepping through the same fetched window, rolling into the
 * previous/next 3-month period at its edges.
 */

import { useState } from 'react'
import { ACTIVITIES, ACTIVITY_BY_KEY } from '../lib/activities'
import { formatShort, monthLabel, todayKey } from '../lib/dates'
import { getPeriod } from '../lib/period'
import { useActivityRange } from '../hooks/useAppData'
import { MonthGrid } from './MonthGrid'

function NavButton({
  dir,
  onClick,
  disabled,
  className = '',
}: {
  dir: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={dir === 'prev' ? 'Previous' : 'Next'}
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-full border border-line-btn bg-white text-ink-2 text-[0.85rem] transition-colors hover:border-ink hover:text-ink disabled:opacity-35 ${className}`}
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  )
}

export function ActivityCalendar() {
  const [periodOffset, setPeriodOffset] = useState(0)
  // Mobile-visible month within the window: 0 = newest of the three
  const [monthIdx, setMonthIdx] = useState(0)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const today = todayKey()
  const period = getPeriod(periodOffset)
  const { logsByDate, error } = useActivityRange(period.fromKey, period.toKey)

  const visible = period.months[monthIdx]

  const prevMonth = () => {
    setSelectedDay(null)
    if (monthIdx === 2) {
      setPeriodOffset(periodOffset + 1)
      setMonthIdx(0)
    } else {
      setMonthIdx(monthIdx + 1)
    }
  }
  const nextMonth = () => {
    setSelectedDay(null)
    if (monthIdx === 0) {
      setPeriodOffset(periodOffset - 1)
      setMonthIdx(2)
    } else {
      setMonthIdx(monthIdx - 1)
    }
  }
  const stepPeriod = (delta: number) => {
    setSelectedDay(null)
    setPeriodOffset(periodOffset + delta)
    setMonthIdx(0)
  }

  const selectedActs = selectedDay ? (logsByDate.get(selectedDay) ?? []) : []

  return (
    <section className="card mb-4">
      <div className="flex items-baseline justify-between mb-3.5">
        {/* Mobile: visible month; desktop: whole period */}
        <div className="md:hidden">
          <div className="card-title">{monthLabel(visible.year, visible.month)}</div>
        </div>
        <div className="hidden md:block">
          <div className="card-title">{period.label}</div>
        </div>
        <div className="flex gap-1.5 md:hidden">
          <NavButton dir="prev" onClick={prevMonth} />
          <NavButton dir="next" onClick={nextMonth} disabled={periodOffset === 0 && monthIdx === 0} />
        </div>
        <div className="hidden md:flex gap-1.5">
          <NavButton dir="prev" onClick={() => stepPeriod(1)} />
          <NavButton dir="next" onClick={() => stepPeriod(-1)} disabled={periodOffset === 0} />
        </div>
      </div>

      <div className="md:grid md:grid-cols-3 md:gap-5">
        {[...period.months].reverse().map((m, i) => {
          // months render oldest → newest; map back to the newest-first index
          const newestFirstIdx = period.months.length - 1 - i
          return (
            <div
              key={`${m.year}-${m.month}`}
              className={`${newestFirstIdx === monthIdx ? 'block' : 'hidden'} md:block`}
            >
              <div className="hidden md:block text-[13px] font-semibold tracking-tight mb-2">
                {monthLabel(m.year, m.month)}
              </div>
              <MonthGrid
                year={m.year}
                month={m.month}
                logsByDate={logsByDate}
                today={today}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3.5">
        {ACTIVITIES.map((a) => (
          <div key={a.key} className="flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
            <i className="w-2.5 h-2.5 rounded-[2px]" style={{ background: a.color }} />
            {a.name}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
          <i className="w-2.5 h-2.5 rounded-[2px] bg-rest" />
          Rest
        </div>
      </div>

      {selectedDay && (
        <div className="mt-3 px-3 py-2.5 rounded-2xl bg-inset border border-line-2 text-[13px] text-ink-2">
          <b className="font-mono text-[12px] font-medium text-ink">{formatShort(selectedDay)}</b> —{' '}
          {selectedActs.length
            ? selectedActs.map((k) => ACTIVITY_BY_KEY[k].name).join(' + ')
            : 'Rest day'}
        </div>
      )}

      {error && <div className="mt-3 text-[0.78rem] text-down">{error}</div>}
    </section>
  )
}
