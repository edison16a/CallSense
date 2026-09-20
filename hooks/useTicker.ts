'use client'

import { useEffect, useState } from 'react'
import { config } from '@/lib/config'

/**
 * Forces a re-render on a fixed interval.
 *
 * The returned counter is intentionally meaningless - nothing displays it.
 * It exists because the dispatch progress bars are computed from
 * `Date.now() - dispatchedAt` during render rather than from state, so
 * without a periodic re-render they would freeze at whatever they showed when
 * the last unrelated state change happened. Deleting the counter as "unused"
 * (the linter will suggest it) silently stops every progress bar.
 */
export function useTicker(): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(current => current + 1), config.timings.progressTickMs)
    return () => clearInterval(interval)
  }, [])

  return tick
}
