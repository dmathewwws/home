/**
 * Derivations for the Weight tab: current entry, delta since the start of
 * the selected range, and a time-correct kg/week trend.
 */

import type { WeightEntry } from './types'
import type { DateRange } from './period'
import { daysBetween } from './dates'

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

export function deriveWeightStats(entries: WeightEntry[], range: DateRange): WeightStats {
  // Lower bound only: every range ends at today, and the log endpoint permits
  // a today+1 entry that an upper clamp would silently hide.
  const windowEntries = entries.filter((e) => e.date >= range.fromKey)

  // Ranges are today-anchored, so the newest entry overall is also the newest
  // in a non-empty window — no need for separate window/global "current".
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

  return { windowEntries, windowLabel: range.label, current, windowStart, deltaKg, trendKgPerWeek }
}
