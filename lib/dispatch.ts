import { parseWaitMinutes } from '@/lib/format'

/** Milliseconds in a minute. Named so the `* 60000` in the progress maths is readable. */
const MS_PER_MINUTE = 60_000

/**
 * How far a dispatched unit has progressed through its estimated wait, 0-100.
 *
 * Pure and `now`-injectable so it can be tested without faking timers. Clamped
 * at 100 because elapsed time keeps growing after arrival; the caller treats
 * 100 as "Finished".
 *
 * Note this is wall-clock progress against a randomly generated estimate, not
 * a real position - see randomWaitTime.
 */
export function dispatchProgressPercent(
  waitTime: string,
  dispatchedAt: number,
  now: number = Date.now()
): number {
  const totalMs = parseWaitMinutes(waitTime) * MS_PER_MINUTE
  const elapsed = now - dispatchedAt
  return Math.min((elapsed / totalMs) * 100, 100)
}
