'use client'

import { useCallback, useRef, useState } from 'react'
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
   * Source of toast ids.
   *
   * WHAT WAS WRONG BEFORE: the id was Date.now(). Two toasts raised in the
   * same millisecond got the same id, which gave React duplicate keys in the
   * stack and, worse, made the first dismissal timer filter both of them out
   * three seconds early. Ending a call raises its toast immediately after the
   * analysis promises settle, so a second toast landing in the same tick is
   * not hypothetical.
   *
   * A counter in a ref cannot collide and does not care about the clock.
   */
  const nextId = useRef(0)

  /** Stable across renders so effects can depend on it without re-subscribing. */
  const push = useCallback((msg: string) => {
    const id = nextId.current++
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
