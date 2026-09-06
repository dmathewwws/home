/**
 * Data hooks: fetch on mount, refetch on matching WebSocket broadcasts.
 * Only mounted behind the membership gate, so calls always carry a
 * verified member's JWT.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalFirstAuth } from './useLocalFirstAuth'
import * as api from '../lib/api'
import type { ActivityKey } from '../lib/activities'
import type { WeightEntry } from '../lib/types'

function useFetched<T>(
  fetcher: (getJwt: api.GetJwt) => Promise<T>,
  eventPrefixes: string[],
  // `resetOnFetcherChange` blanks `data` the moment the fetcher changes, so a
  // caller never renders the previous key's result. Off by default: the
  // calendar wants its old tiles to stay put while the next period loads.
  { resetOnFetcherChange = false }: { resetOnFetcherChange?: boolean } = {},
): { data: T | null; error: string | null; loading: boolean; refetch: () => void } {
  const { getProfileJwt, subscribeToEvents } = useLocalFirstAuth()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Unlike the recipes original, `fetcher` is a dependency here: the activity
  // range fetcher changes with the viewed period, so callers must memoize it.
  const refetch = useCallback(() => {
    let cancelled = false
    fetcher(getProfileJwt)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [fetcher, getProfileJwt])

  useEffect(() => {
    if (resetOnFetcherChange) setData(null)
    const cancel = refetch()
    const unsubscribe = subscribeToEvents((type) => {
      if (eventPrefixes.some((prefix) => type.startsWith(prefix))) refetch()
    })
    return () => {
      cancel()
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, subscribeToEvents])

  return { data, error, loading, refetch }
}

/** Activity logs for an inclusive date-key window, as a Map keyed by date. */
export function useActivityRange(fromKey: string, toKey: string) {
  const fetcher = useCallback(
    (getJwt: api.GetJwt) => api.fetchActivityRange(getJwt, fromKey, toKey),
    [fromKey, toKey],
  )
  const { data, error, loading } = useFetched(fetcher, ['activity-'])
  const logsByDate = useMemo(() => {
    const map = new Map<string, ActivityKey[]>()
    for (const log of data ?? []) map.set(log.date, log.activities)
    return map
  }, [data])
  return { logsByDate, error, loading }
}

/**
 * One day's activity set — the calendar's selected day, or today. Independent
 * of the calendar's viewed period. `loaded` is false until this exact day's
 * rows are in hand, so the caller can avoid rendering an empty set as "rest".
 */
export function useDayLog(date: string) {
  const fetcher = useCallback(
    (getJwt: api.GetJwt) => api.fetchActivityRange(getJwt, date, date),
    [date],
  )
  const { data, error } = useFetched(fetcher, ['activity-'], { resetOnFetcherChange: true })
  return { activities: data?.[0]?.activities ?? [], loaded: data !== null, error }
}

export function useWeights() {
  // Memoized: useFetched keys its refetch on the fetcher reference
  const fetcher = useCallback((getJwt: api.GetJwt) => api.listWeights(getJwt), [])
  const { data, error, loading } = useFetched<WeightEntry[]>(fetcher, ['weight-'])
  return { entries: data, error, loading }
}
