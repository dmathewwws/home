/**
 * One month of the activity calendar: weekday header, leading blanks, and a
 * 7-column grid of rounded day tiles — solid color for one activity, a
 * diagonal split for two-plus, muted gray for rest, faded for future, and an
 * ink ring on today.
 */

import { ACTIVITY_BY_KEY, type ActivityKey } from '../lib/activities'
import { dateKey, daysInMonth, firstDowOfMonth } from '../lib/dates'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface MonthGridProps {
  year: number
  month: number // 0-indexed
  logsByDate: Map<string, ActivityKey[]>
  today: string
  selectedDay: string | null
  onSelectDay: (key: string) => void
}

export function MonthGrid({ year, month, logsByDate, today, selectedDay, onSelectDay }: MonthGridProps) {
  const blanks = firstDowOfMonth(year, month)
  const total = daysInMonth(year, month)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {DOW.map((d, i) => (
          <span key={i} className="text-center text-[10px] font-semibold text-weekday">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`b-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1
          const key = dateKey(year, month, day)
          const isFuture = key > today
          const isToday = key === today
          const acts = logsByDate.get(key) ?? []

          let style: React.CSSProperties | undefined
          let numberClass = 'text-ink/40'
          let bgClass = 'bg-rest'
          if (isFuture) {
            bgClass = 'bg-future'
            numberClass = 'text-faint'
          } else if (acts.length === 1) {
            bgClass = ''
            style = { background: ACTIVITY_BY_KEY[acts[0]].color }
            numberClass = 'text-white/[.92]'
          } else if (acts.length >= 2) {
            bgClass = ''
            const c1 = ACTIVITY_BY_KEY[acts[0]].color
            const c2 = ACTIVITY_BY_KEY[acts[1]].color
            style = { background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` }
            numberClass = 'text-white/[.92]'
          }

          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDay(key)}
              aria-label={key}
              aria-pressed={selectedDay === key}
              style={style}
              className={`relative aspect-square rounded-[4px] flex items-center justify-center text-[0.68rem] font-semibold transition-transform ${bgClass} ${numberClass} ${
                isFuture ? 'cursor-default' : 'cursor-pointer active:scale-[.94]'
              }`}
            >
              {day}
              {isToday && (
                <span className="absolute inset-[-2px] rounded-[6px] border-[1.5px] border-ink pointer-events-none" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
