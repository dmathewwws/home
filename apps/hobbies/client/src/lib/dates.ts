/**
 * Date helpers. All app dates are user-local 'YYYY-MM-DD' keys — the client
 * is the source of truth for "today" (fitness precedent).
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const todayKey = (): string => toKey(new Date())

/** 'YYYY-MM-DD' key → local-midnight Date. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** '2026-08-21' → 'AUG 21' (journal date stamps). */
export function formatWhen(key: string): string {
  const [, m, d] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${d}`
}

/** 'SUNDAY · AUG 23' (the Today screen's eyebrow). */
export function eyebrowDate(d = new Date()): string {
  return d
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase()
    .replace(',', ' ·')
}

/** 'AUG' month label for a date key (heatmap legend endpoints). */
export const monthLabel = (key: string): string => MONTHS[Number(key.split('-')[1]) - 1]

/** The n date keys ending at (and including) endKey, oldest first. */
export function trailingDays(n: number, endKey: string): string[] {
  const end = fromKey(endKey)
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(end)
    day.setDate(end.getDate() - i)
    keys.push(toKey(day))
  }
  return keys
}
