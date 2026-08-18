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
