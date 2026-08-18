/**
 * Date-key helpers. All date keys are user-local 'YYYY-MM-DD' strings —
 * built and compared locally, never via UTC/ISO conversions.
 */

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function dateKey(year: number, month: number, day: number): string {
  return toDateKey(new Date(year, month, day))
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Weekday (0 = Sunday) of the 1st of the month — the count of leading blank grid cells. */
export function firstDowOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

/** '2026-08-14' → 'Aug 14' */
export function formatShort(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** e.g. 'August 2026' */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** e.g. 'Aug 2026' */
export function monthLabelShort(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
