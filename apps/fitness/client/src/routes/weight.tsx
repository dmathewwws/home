/**
 * Weight tab: current weight + entry input on top, 3-month trend chart with
 * goal line and stats below. All values in kg.
 */

import { useState } from 'react'
import { NavPills, TopBar } from '../components/Chrome'
import { WeightChart } from '../components/WeightChart'
import { useWeights } from '../hooks/useAppData'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { logWeight } from '../lib/api'
import { GOAL_KG } from '../lib/constants'
import { formatShort, todayKey } from '../lib/dates'
import { deriveWeightStats } from '../lib/weight-math'

export function Weight() {
  const { getProfileJwt } = useLocalFirstAuth()
  const { entries, error: fetchError } = useWeights()
  const [input, setInput] = useState('')
  const [savedFor, setSavedFor] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Optimistic overlay: today's just-logged value until the refetch lands
  const [pending, setPending] = useState<{ date: string; kg: number } | null>(null)

  const merged = (() => {
    const list = entries ?? []
    if (!pending) return list
    const without = list.filter((e) => e.date !== pending.date)
    return [...without, pending].sort((a, b) => (a.date < b.date ? -1 : 1))
  })()

  const stats = deriveWeightStats(merged)

  const save = async () => {
    const kg = Math.round(parseFloat(input) * 10) / 10
    if (!Number.isFinite(kg) || kg < 30 || kg > 250) {
      setSaveError('Enter a weight between 30 and 250 kg')
      return
    }
    const date = todayKey()
    setPending({ date, kg })
    setSaveError(null)
    try {
      await logWeight(getProfileJwt, date, kg)
      setSavedFor(date)
      setInput('')
    } catch (err) {
      setPending(null)
      setSaveError(err instanceof Error ? err.message : 'Could not save — try again')
    }
  }

  const losing = stats.deltaKg !== null && stats.deltaKg >= 0

  return (
    <>
      <TopBar
        left={<h1 className="font-display text-[20px] font-bold tracking-tight">Weight</h1>}
        right={<NavPills />}
      />
      <div className="page-col px-5 pb-8">
        <section className="card mb-4">
          <div className="flex items-baseline justify-between mb-3.5">
            <div className="card-title">Current weight</div>
            <div className="card-sub">
              {stats.current ? `Last entry ${formatShort(stats.current.date)}` : 'No entries yet'}
            </div>
          </div>
          <div className="flex items-end justify-between mb-4">
            <div className="font-display text-[2.2rem] font-bold tracking-tight leading-none tabular-nums">
              {stats.current ? stats.current.kg.toFixed(1) : '—'}
              <small className="text-[13px] font-semibold text-ink-3 tracking-normal"> kg</small>
            </div>
            {stats.deltaKg !== null && stats.windowStart && (
              <div className="text-right text-[0.72rem] font-medium text-ink-2">
                <b
                  className={`block font-mono text-[0.9rem] font-medium tabular-nums ${losing ? 'text-up' : 'text-down'}`}
                >
                  {losing ? '▼' : '▲'} {Math.abs(stats.deltaKg).toFixed(1)} kg
                </b>
                since {formatShort(stats.windowStart.date)}
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="Enter today's weight (kg)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className="flex-1 min-w-0 rounded-full border border-input bg-white px-4 py-[10px] text-sm font-medium tabular-nums text-ink outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={save}
              className="btn-primary px-4 text-[13px]"
            >
              Log weight
            </button>
          </div>
          {savedFor && !saveError && (
            <div className="mt-2 text-[0.72rem] font-semibold text-up">
              Logged for {formatShort(savedFor)} ✓
            </div>
          )}
          {saveError && <div className="mt-2 text-[0.78rem] text-down">{saveError}</div>}
        </section>

        <section className="card">
          <div className="flex items-baseline justify-between mb-3.5">
            <div className="card-title">Progress</div>
            <div className="card-sub">{stats.windowLabel}</div>
          </div>
          <div className="mt-1.5">
            <WeightChart entries={stats.windowEntries} goal={GOAL_KG} />
          </div>
          <div className="flex gap-[18px] mt-3.5 pt-3 border-t border-line-2">
            <div>
              <b className="font-mono text-[15px] font-medium tabular-nums">
                {stats.windowStart ? stats.windowStart.kg.toFixed(1) : '—'}
              </b>
              <span className="block text-[0.66rem] font-medium text-ink-2 mt-px">
                starting{stats.windowStart ? ` (${formatShort(stats.windowStart.date)})` : ''}
              </span>
            </div>
            <div>
              <b className="font-mono text-[15px] font-medium tabular-nums">
                {stats.current ? stats.current.kg.toFixed(1) : '—'}
              </b>
              <span className="block text-[0.66rem] font-medium text-ink-2 mt-px">current</span>
            </div>
            <div>
              <b className="font-mono text-[15px] font-medium tabular-nums">
                {stats.trendKgPerWeek !== null
                  ? `${stats.trendKgPerWeek > 0 ? '+' : '−'}${Math.abs(stats.trendKgPerWeek).toFixed(1)}`
                  : '—'}
              </b>
              <span className="block text-[0.66rem] font-medium text-ink-2 mt-px">kg / week trend</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-3.5 pt-3 border-t border-line-2 text-[0.78rem] text-ink-2">
            <span>Goal weight</span>
            <span>
              <b className="font-mono font-medium text-ink tabular-nums">{GOAL_KG.toFixed(1)} kg</b>
              {stats.current && (
                <> · {Math.max(0, stats.current.kg - GOAL_KG).toFixed(1)} kg to go</>
              )}
            </span>
          </div>
          {fetchError && <div className="mt-3 text-[0.78rem] text-down">{fetchError}</div>}
        </section>
      </div>
    </>
  )
}
