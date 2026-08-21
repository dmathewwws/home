/**
 * Weight tab: current weight + entry input on top, a range-selectable trend
 * chart with goal line and stats in the middle, full entry log at the bottom.
 * The range chips scope only the Progress card — the current-weight hero and
 * the entry log always reflect the complete history. All values
 * in kg. Progress photos are attached afterwards from the entry log.
 */

import { useEffect, useState } from 'react'
import { NavPills, TopBar } from '../components/Chrome'
import { WeightChart } from '../components/WeightChart'
import { WeightLog } from '../components/WeightLog'
import { useWeights } from '../hooks/useAppData'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { deleteWeight, logWeight } from '../lib/api'
import { GOAL_KG } from '../lib/constants'
import { formatShort, todayKey } from '../lib/dates'
import { getRange, RANGE_OPTIONS, type RangeKey } from '../lib/period'
import type { WeightEntry } from '../lib/types'
import { deriveWeightStats } from '../lib/weight-math'

export function Weight() {
  const { getProfileJwt } = useLocalFirstAuth()
  const { entries, error: fetchError } = useWeights()
  const [input, setInput] = useState('')
  // Scopes the Progress card only; every range ends at today
  const [rangeKey, setRangeKey] = useState<RangeKey>('3m')
  const [savedFor, setSavedFor] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Optimistic overlay: today's just-logged value until the refetch lands
  const [pending, setPending] = useState<WeightEntry | null>(null)
  // Optimistic removals, likewise cleared once the refetch reflects them
  const [deletedDates, setDeletedDates] = useState<Set<string>>(new Set())

  // Drop each optimistic overlay as soon as the server data agrees with it
  useEffect(() => {
    if (!entries) return
    setPending((p) =>
      p && entries.some((e) => e.date === p.date && e.kg === p.kg && e.photoId === p.photoId) ? null : p,
    )
    setDeletedDates((dates) => {
      if (dates.size === 0) return dates
      const next = new Set([...dates].filter((date) => entries.some((e) => e.date === date)))
      return next.size === dates.size ? dates : next
    })
  }, [entries])

  const merged = (() => {
    const list = (entries ?? []).filter((e) => !deletedDates.has(e.date))
    if (!pending) return list
    const without = list.filter((e) => e.date !== pending.date)
    return [...without, pending].sort((a, b) => (a.date < b.date ? -1 : 1))
  })()

  const range = getRange(rangeKey, merged[0]?.date ?? null)
  const stats = deriveWeightStats(merged, range)

  const save = async () => {
    const kg = Math.round(parseFloat(input) * 10) / 10
    if (!Number.isFinite(kg) || kg < 30 || kg > 250) {
      setSaveError('Enter a weight between 30 and 250 kg')
      return
    }
    const date = todayKey()
    setPending({ date, kg, photoId: null })
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

  const handleDelete = async (date: string) => {
    setDeletedDates((dates) => new Set(dates).add(date))
    try {
      await deleteWeight(getProfileJwt, date)
    } catch (err) {
      setDeletedDates((dates) => {
        const next = new Set(dates)
        next.delete(date)
        return next
      })
      throw err
    }
  }

  const handleAttachPhoto = (date: string, kg: number, newPhotoId: string) =>
    logWeight(getProfileJwt, date, kg, newPhotoId).then(() => undefined)

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
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="card-title">Progress</div>
            <div
              className="flex items-center gap-0.5 rounded-full bg-chip p-[3px]"
              role="group"
              aria-label="Chart range"
            >
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRangeKey(opt.key)}
                  aria-pressed={rangeKey === opt.key}
                  className={`text-[12px] font-semibold rounded-full px-3 py-1 transition-colors ${
                    rangeKey === opt.key
                      ? 'bg-white text-ink border border-line'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="card-sub mb-3.5">{stats.windowLabel}</div>
          <div className="mt-1.5">
            <WeightChart
              entries={stats.windowEntries}
              goal={GOAL_KG}
              fromKey={range.fromKey}
              toKey={range.toKey}
              emptyMessage={merged.length ? 'No weigh-ins in this range.' : undefined}
            />
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

        <WeightLog entries={merged} onDelete={handleDelete} onAttachPhoto={handleAttachPhoto} />
      </div>
    </>
  )
}
