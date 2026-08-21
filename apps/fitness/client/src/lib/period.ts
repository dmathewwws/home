/**
 * 3-month window math, adapted from the status-page service view: offset 0 is
 * the current month plus the two before it; each increment steps back a full
 * 3 months. Bounds are inclusive local date keys (not unix) because the API
 * speaks 'YYYY-MM-DD'.
 */

import { dateKey, daysInMonth, monthLabelShort } from './dates'

export interface PeriodMonth {
  year: number
  month: number // 0-indexed
}

export interface Period {
  /** Newest first */
  months: PeriodMonth[]
  fromKey: string
  toKey: string
  label: string
}

const MONTHS_PER_PERIOD = 3

export function getPeriod(periodOffset: number, now: Date = new Date()): Period {
  const months: PeriodMonth[] = []
  for (let i = 0; i < MONTHS_PER_PERIOD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i - periodOffset * MONTHS_PER_PERIOD, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  const latest = months[0]
  const earliest = months[months.length - 1]
  return {
    months,
    fromKey: dateKey(earliest.year, earliest.month, 1),
    toKey: dateKey(latest.year, latest.month, daysInMonth(latest.year, latest.month)),
    label: `${monthLabelShort(earliest.year, earliest.month)} – ${monthLabelShort(latest.year, latest.month)}`,
  }
}

/** Spans offered by the Weight tab's range chips. All are anchored to today. */
export type RangeKey = '3m' | '6m' | '1y' | 'all'

export interface DateRange {
  fromKey: string
  /** Today — every range ends at the present. */
  toKey: string
  label: string
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'All' },
]

const MONTHS_BACK: Record<Exclude<RangeKey, 'all'>, number> = { '3m': 3, '6m': 6, '1y': 12 }

/**
 * Month-aligned window ending today: '3m' is the current month plus the two
 * before it, so it reproduces `getPeriod(0)`'s bounds. 'all' runs from the
 * caller's earliest entry (or the start of this month when there are none).
 */
export function getRange(
  key: RangeKey,
  earliestEntryKey: string | null,
  now: Date = new Date(),
): DateRange {
  const toKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfThisMonth = dateKey(now.getFullYear(), now.getMonth(), 1)

  const fromKey =
    key === 'all'
      ? (earliestEntryKey ?? startOfThisMonth)
      : (() => {
          const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK[key] - 1), 1)
          return dateKey(d.getFullYear(), d.getMonth(), 1)
        })()

  const [fy, fm] = fromKey.split('-').map(Number)
  const label = `${monthLabelShort(fy, fm - 1)} – ${monthLabelShort(now.getFullYear(), now.getMonth())}`

  return { fromKey, toKey, label }
}
