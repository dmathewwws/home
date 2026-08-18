/**
 * "What did you do?" quick-log card: eight tappable activity chips that
 * upsert today's log immediately. Optimistic — the chip flips at once and
 * the resulting `activity-logged` broadcast refetches the calendar so
 * today's tile recolors live; on API failure the chip reverts.
 */

import { useEffect, useState } from 'react'
import { ACTIVITIES, type ActivityKey } from '../lib/activities'
import { logActivities } from '../lib/api'
import { todayKey } from '../lib/dates'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { useTodayLog } from '../hooks/useAppData'

export function QuickLog() {
  const { getProfileJwt } = useLocalFirstAuth()
  const { activities: fetched } = useTodayLog()
  const [selected, setSelected] = useState<ActivityKey[]>([])
  const [error, setError] = useState<string | null>(null)

  // Follow server state (initial load + other-device changes); optimistic
  // toggles below overwrite this until the next broadcast-driven refetch.
  useEffect(() => {
    setSelected(fetched)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(fetched)])

  const toggle = async (key: ActivityKey) => {
    const prev = selected
    // Preserve the canonical catalog order so tile split colors are stable
    const next = prev.includes(key)
      ? prev.filter((k) => k !== key)
      : ACTIVITIES.filter((a) => prev.includes(a.key) || a.key === key).map((a) => a.key)
    setSelected(next)
    setError(null)
    try {
      await logActivities(getProfileJwt, todayKey(), next)
    } catch (err) {
      setSelected(prev)
      setError(err instanceof Error ? err.message : 'Could not save — try again')
    }
  }

  return (
    <section className="card mb-4">
      <div className="eyebrow mb-0.5">Today</div>
      <div className="font-display text-[18px] font-bold tracking-tight mb-3">
        What did you do?
      </div>
      <div className="flex flex-wrap gap-2">
        {ACTIVITIES.map((a) => {
          const on = selected.includes(a.key)
          return (
            <button
              key={a.key}
              type="button"
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
        Tap to log — today's tile updates on the calendar above.
      </div>
      {error && <div className="mt-2 text-[0.78rem] text-down">{error}</div>}
    </section>
  )
}
