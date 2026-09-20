'use client'

import { useCallback, useState } from 'react'
import { config } from '@/lib/config'

/** A transient notification. `id` doubles as the React key and the dismissal handle. */
export interface Toast {
  id: number
  msg: string
}

/**
 * Queue of transient notifications.
 *
 * Each toast removes itself after config.timings.toastDurationMs via its own
 * timer, rather than one shared sweep, so toasts raised at different moments
 * expire at different moments.
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  /**
   * Stable across renders so effects can depend on it without re-subscribing.
   * The id is the current clock reading, which is also why two toasts raised
   * within the same millisecond would collide - acceptable, since they are
   * raised by discrete user actions.
   */
  const push = useCallback((msg: string) => {
    const id = Date.now()
    setToasts(current => [...current, { id, msg }])
    setTimeout(
      () => setToasts(current => current.filter(toast => toast.id !== id)),
      config.timings.toastDurationMs
    )
  }, [])

  return { push, toasts }
}

/** The `push` callback's type, for components that only raise toasts. */
export type PushToast = ReturnType<typeof useToast>['push']
