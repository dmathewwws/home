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
import { todayKey } from '../lib/dates'

function useFetched<T>(
  fetcher: (getJwt: api.GetJwt) => Promise<T>,
  eventPrefixes: string[],
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

/** Today's activity set — independent of the calendar's viewed period. */
export function useTodayLog() {
  const today = todayKey()
  const fetcher = useCallback(
    (getJwt: api.GetJwt) => api.fetchActivityRange(getJwt, today, today),
    [today],
  )
  const { data, error, loading } = useFetched(fetcher, ['activity-'])
  return { activities: data?.[0]?.activities ?? [], error, loading }
}

export function useWeights() {
  // Memoized: useFetched keys its refetch on the fetcher reference
  const fetcher = useCallback((getJwt: api.GetJwt) => api.listWeights(getJwt), [])
  const { data, error, loading } = useFetched<WeightEntry[]>(fetcher, ['weight-'])
  return { entries: data, error, loading }
}
