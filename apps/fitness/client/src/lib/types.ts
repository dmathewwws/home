import type { ActivityKey } from './activities'

export interface ActivityLog {
  date: string // 'YYYY-MM-DD'
  activities: ActivityKey[]
}

export interface WeightEntry {
  date: string // 'YYYY-MM-DD'
  kg: number
}
