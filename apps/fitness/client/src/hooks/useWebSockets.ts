import { useEffect, useRef, useState } from 'react'

interface UseWebSocketsOptions {
  userId: string | undefined
  isAdmin: boolean
  onReset?: () => void
  /**
   * Generic handler for every other broadcast type (activity-logged,
   * weight-logged, …). Payloads are minimal {did, date} signals —
   * consumers refetch through the authenticated API.
   */
  onMessage?: (type: string, data: unknown) => void
}

export function useWebSockets({ userId, isAdmin, onReset, onMessage }: UseWebSocketsOptions) {
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Keep the latest handlers without re-opening the socket on each render
  const handlersRef = useRef({ isAdmin, onReset, onMessage })
  handlersRef.current = { isAdmin, onReset, onMessage }

  useEffect(() => {
    if (!userId) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}${import.meta.env.BASE_URL}api/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const handlers = handlersRef.current

        if (data.type === 'reset') {
          setResetMessage(data.data.message)
          if (!handlers.isAdmin) {
            handlers.onReset?.()
          }
          return
        }

        if (typeof data.type === 'string') {
          handlers.onMessage?.(data.type, data.data)
        }
      } catch (err) {
        console.error('WebSocket message error:', err)
      }
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [userId])

  return { resetMessage, setResetMessage }
}
