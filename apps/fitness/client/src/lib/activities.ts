/**
 * Activity catalog — keys must stay in sync with ACTIVITY_KEYS in
 * server/src/db/schema.ts (the server validates against that list).
 * Order here is the chip/legend display order.
 */

export const ACTIVITIES = [
  { key: 'bike', name: 'Biking', color: '#5FA8A0' },
  { key: 'yoga', name: 'Yoga', color: '#A48BC9' },
  { key: 'bball', name: 'Basketball', color: '#E0A458' },
  { key: 'stretch', name: 'Stretch', color: '#93B88B' },
  { key: 'outrig', name: 'Outrigger', color: '#5B84C4' },
  { key: 'disc', name: 'Disc Golf', color: '#A9B75C' },
  { key: 'badm', name: 'Badminton', color: '#C77E8F' },
  { key: 'swim', name: 'Swim', color: '#64AFCF' },
] as const

export type ActivityKey = (typeof ACTIVITIES)[number]['key']

export const ACTIVITY_BY_KEY = Object.fromEntries(
  ACTIVITIES.map((a) => [a.key, a]),
) as Record<ActivityKey, (typeof ACTIVITIES)[number]>
