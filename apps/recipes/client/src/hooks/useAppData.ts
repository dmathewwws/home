/**
 * Data hooks: fetch on mount, refetch on matching WebSocket broadcasts.
 * Only mounted behind the verification gate, so calls always carry a
 * verified member's JWT.
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocalFirstAuth } from './useLocalFirstAuth'
import * as api from '../lib/api'
import type { DishListItem, RecipeListItem, ReflectionListItem } from '../lib/types'

function useFetched<T>(
  fetcher: (getJwt: api.GetJwt) => Promise<T>,
  eventPrefixes: string[],
): { data: T | null; error: string | null; loading: boolean; refetch: () => void } {
  const { getProfileJwt, subscribeToEvents } = useLocalFirstAuth()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getProfileJwt])

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

export function useRecipes() {
  const { data, error, loading, refetch } = useFetched<RecipeListItem[]>(
    (getJwt) => api.listRecipes(getJwt),
    // reflection events change tallies/last-cooked on recipe rows too
    ['recipe-', 'reflection-'],
  )
  return { recipes: data, error, loading, refetch }
}

export function useReflections() {
  const { data, error, loading, refetch } = useFetched<ReflectionListItem[]>(
    (getJwt) => api.listReflections(getJwt),
    ['reflection-'],
  )
  return { reflections: data, error, loading, refetch }
}

export function useDishes() {
  const { data, error, loading, refetch } = useFetched<DishListItem[]>(
    (getJwt) => api.listDishes(getJwt),
    ['dish-'],
  )
  return { dishes: data, error, loading, refetch }
}
