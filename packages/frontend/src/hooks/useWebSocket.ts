import { useEffect, useRef, useCallback } from 'react'

interface UseWebSocketOptions {
  /** Messages to send on connect (e.g. subscriptions) */
  subscriptions?: Record<string, unknown>[]
  /** Handler for incoming messages (already parsed) */
  onMessage: (data: Record<string, unknown>) => void
  /** Whether WebSocket should be active (default: true) */
  enabled?: boolean
  /** Ping interval in ms (default: 30000) */
  pingInterval?: number
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    subscriptions = [],
    onMessage,
    enabled = true,
    pingInterval = 30000,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  // Stable reference to onMessage to avoid reconnect loops
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const subscriptionsRef = useRef(subscriptions)
  subscriptionsRef.current = subscriptions

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!isMountedRef.current) return
    if (import.meta.env.VITE_USE_WEBSOCKETS !== 'true') return

    cleanup()

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0
        // Send subscription messages
        for (const sub of subscriptionsRef.current) {
          ws.send(JSON.stringify(sub))
        }
        // Start heartbeat
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }))
          }
        }, pingInterval)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current(data)
        } catch {
          // ignore malformed messages
        }
      }

      ws.onerror = () => {
        // error triggers onclose, reconnect handled there
      }

      ws.onclose = () => {
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current)
          pingTimerRef.current = null
        }
        // Auto-reconnect with exponential backoff
        if (isMountedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current)
          reconnectAttemptsRef.current++
          reconnectTimerRef.current = setTimeout(connect, delay)
        }
      }
    } catch {
      // connection failed, retry
      if (isMountedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++
        reconnectTimerRef.current = setTimeout(connect, reconnectDelay)
      }
    }
  }, [cleanup, pingInterval, reconnectDelay, maxReconnectAttempts])

  useEffect(() => {
    isMountedRef.current = true

    if (enabled) {
      connect()
    }

    return () => {
      isMountedRef.current = false
      cleanup()
    }
  }, [enabled, connect, cleanup])
}
