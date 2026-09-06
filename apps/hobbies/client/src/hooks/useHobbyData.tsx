/**
 * All hobby data for the signed-in member, loaded once via /api/bootstrap and
 * kept current by patching state from each mutation's response. logSession
 * updates optimistically-from-response (prepend journal, bump heatmap) so the
 * toast + today-tile pop feel instant; a full refetch is only for recovery.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as Api from '../lib/api'
import { todayKey } from '../lib/dates'
import type { BootstrapData, Hobby, HobbyKind, Piece, PieceLink, SessionEntry } from '../lib/types'
import { useLocalFirstAuth } from './useLocalFirstAuth'

interface HobbyDataValue extends BootstrapData {
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  addHobby: (name: string, kind: HobbyKind, hueIndex: number) => Promise<Hobby>
  addPiece: (hobbyId: string, name: string, links?: PieceLink[], source?: 'muse') => Promise<Piece>
  editPiece: (id: string, name: string, links?: PieceLink[]) => Promise<Piece>
  removePiece: (id: string) => Promise<void>
  logSession: (hobbyId: string, pieceId: string | null, photoId?: string) => Promise<SessionEntry>
  removeSession: (id: string) => Promise<void>
  summonMuse: (hobbyId: string, excludeTitles?: string[]) => ReturnType<typeof Api.summonMuse>
}

const HobbyDataContext = createContext<HobbyDataValue | null>(null)

const EMPTY: BootstrapData = { hobbies: [], pieces: [], heatmap: [], journal: [] }

export function HobbyDataProvider({ children }: { children: ReactNode }) {
  const { getProfileJwt } = useLocalFirstAuth()
  const [data, setData] = useState<BootstrapData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setError(null)
      setData(await Api.fetchBootstrap(getProfileJwt, todayKey()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [getProfileJwt])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const addHobby = useCallback(
    async (name: string, kind: HobbyKind, hueIndex: number) => {
      const hobby = await Api.createHobby(getProfileJwt, name, kind, hueIndex)
      setData((d) => ({ ...d, hobbies: [...d.hobbies, hobby] }))
      return hobby
    },
    [getProfileJwt],
  )

  const addPiece = useCallback(
    async (hobbyId: string, name: string, links: PieceLink[] = [], source?: 'muse') => {
      const piece = await Api.createPiece(getProfileJwt, hobbyId, name, links, source)
      setData((d) => ({ ...d, pieces: [...d.pieces, piece] }))
      return piece
    },
    [getProfileJwt],
  )

  const editPiece = useCallback(
    async (id: string, name: string, links: PieceLink[] = []) => {
      const piece = await Api.updatePiece(getProfileJwt, id, name, links)
      setData((d) => ({ ...d, pieces: d.pieces.map((p) => (p.id === piece.id ? piece : p)) }))
      return piece
    },
    [getProfileJwt],
  )

  const removePiece = useCallback(
    async (id: string) => {
      await Api.deletePiece(getProfileJwt, id)
      setData((d) => ({ ...d, pieces: d.pieces.filter((p) => p.id !== id) }))
    },
    [getProfileJwt],
  )

  const logSession = useCallback(
    async (hobbyId: string, pieceId: string | null, photoId?: string) => {
      const session = await Api.logSession(getProfileJwt, hobbyId, pieceId, todayKey(), photoId)
      setData((d) => {
        const heatmap = [...d.heatmap]
        const i = heatmap.findIndex((h) => h.date === session.date && h.hobbyId === session.hobbyId)
        if (i >= 0) heatmap[i] = { ...heatmap[i], count: heatmap[i].count + 1 }
        else heatmap.push({ date: session.date, hobbyId: session.hobbyId, count: 1 })
        return { ...d, heatmap, journal: [session, ...d.journal] }
      })
      return session
    },
    [getProfileJwt],
  )

  const removeSession = useCallback(
    async (id: string) => {
      await Api.deleteSession(getProfileJwt, id)
      setData((d) => {
        const session = d.journal.find((s) => s.id === id)
        let heatmap = d.heatmap
        if (session) {
          heatmap = d.heatmap
            .map((h) =>
              h.date === session.date && h.hobbyId === session.hobbyId
                ? { ...h, count: h.count - 1 }
                : h,
            )
            .filter((h) => h.count > 0)
        }
        return { ...d, heatmap, journal: d.journal.filter((s) => s.id !== id) }
      })
    },
    [getProfileJwt],
  )

  const summonMuse = useCallback(
    (hobbyId: string, excludeTitles: string[] = []) =>
      Api.summonMuse(getProfileJwt, hobbyId, excludeTitles),
    [getProfileJwt],
  )

  const value = useMemo<HobbyDataValue>(
    () => ({
      ...data,
      loading,
      error,
      refetch,
      addHobby,
      addPiece,
      editPiece,
      removePiece,
      logSession,
      removeSession,
      summonMuse,
    }),
    [
      data,
      loading,
      error,
      refetch,
      addHobby,
      addPiece,
      editPiece,
      removePiece,
      logSession,
      removeSession,
      summonMuse,
    ],
  )

  return <HobbyDataContext.Provider value={value}>{children}</HobbyDataContext.Provider>
}

export function useHobbyData(): HobbyDataValue {
  const ctx = useContext(HobbyDataContext)
  if (!ctx) throw new Error('useHobbyData must be used within HobbyDataProvider')
  return ctx
}
