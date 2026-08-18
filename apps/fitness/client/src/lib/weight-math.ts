/**
 * Derivations for the Weight tab: current entry, delta since the start of
 * the 3-month window, and a time-correct kg/week trend.
 */

import type { WeightEntry } from './types'
import { getPeriod } from './period'

export interface WeightStats {
  windowEntries: WeightEntry[]
  windowLabel: string
  current: WeightEntry | null
  windowStart: WeightEntry | null
  /** Positive = lost weight since window start */
  deltaKg: number | null
  /** Least-squares slope in kg per week over the window; null with <2 entries */
  trendKgPerWeek: number | null
}

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  return Math.round((new Date(ty, tm - 1, td).getTime() - new Date(fy, fm - 1, fd).getTime()) / 86400000)
}

export function deriveWeightStats(entries: WeightEntry[]): WeightStats {
  const period = getPeriod(0)
  const windowEntries = entries.filter((e) => e.date >= period.fromKey && e.date <= period.toKey)

  const current = entries.length ? entries[entries.length - 1] : null
  const windowStart = windowEntries.length ? windowEntries[0] : null
  const deltaKg = current && windowStart ? windowStart.kg - current.kg : null

  let trendKgPerWeek: number | null = null
  if (windowEntries.length >= 2) {
    const xs = windowEntries.map((e) => daysBetween(windowEntries[0].date, e.date))
    const ys = windowEntries.map((e) => e.kg)
    const n = xs.length
    const meanX = xs.reduce((a, b) => a + b, 0) / n
    const meanY = ys.reduce((a, b) => a + b, 0) / n
    const denom = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0)
    if (denom > 0) {
      const slopePerDay = xs.reduce((acc, x, i) => acc + (x - meanX) * (ys[i] - meanY), 0) / denom
      trendKgPerWeek = slopePerDay * 7
    }
  }

  return { windowEntries, windowLabel: period.label, current, windowStart, deltaKg, trendKgPerWeek }
}
