import { useEffect, useRef } from 'react'

export type RealtimeEvent = { event: string; payload: Record<string, unknown> }

export function useRealtime(onEvent: (e: RealtimeEvent) => void) {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    let ws: WebSocket | null = null
    let closedByUs = false
    let retryTimer: ReturnType<typeof setTimeout>

    function connect() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${location.host}/ws`)
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data) as RealtimeEvent
          handlerRef.current(data)
        } catch {
          /* ignore malformed message */
        }
      }
      ws.onclose = () => {
        if (!closedByUs) retryTimer = setTimeout(connect, 2000)
      }
    }
    connect()

    return () => {
      closedByUs = true
      clearTimeout(retryTimer)
      ws?.close()
    }
  }, [])
}
