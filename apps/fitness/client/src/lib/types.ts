import type { ActivityKey } from './activities'

export interface ActivityLog {
  date: string // 'YYYY-MM-DD'
  activities: ActivityKey[]
}

export interface WeightEntry {
  date: string // 'YYYY-MM-DD'
  kg: number
  /** uuid of an optional progress photo; URLs derived via api.imgUrl() */
  photoId: string | null
}
