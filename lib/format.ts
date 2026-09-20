import { config } from '@/lib/config'

/** Formats a count for display, e.g. `1234` -> `"1,234"`. Locale-aware by design. */
export function formatCount(value: number): string {
  return value.toLocaleString()
}

/**
 * Invents a wait time for a newly queued call, e.g. `"7 min"`.
 *
 * This is placeholder data, not an estimate: nothing in the app models real
 * dispatch capacity. It is stored pre-formatted because the queue renders it
 * far more often than it parses it.
 */
export function randomWaitTime(): string {
  const minutes = Math.ceil(Math.random() * config.limits.maxWaitMinutes)
  return `${minutes} ${config.waitTime.unit}`
}

/**
 * Reads the minute count back out of a formatted wait time.
 *
 * `parseInt` stops at the first non-digit, which is what makes the
 * "7 min" round-trip work. Pairs with randomWaitTime - if that format ever
 * gains a leading character, this is the other half to change.
 */
export function parseWaitMinutes(waitTime: string): number {
  return parseInt(waitTime)
}

/**
 * Timestamp appended to stored transcripts, e.g. `"2026-09-20 14:03:11"`.
 *
 * Derived from the ISO string, so it is UTC rather than the dispatcher's local
 * time. Preserved as-is: changing it would silently reinterpret every
 * timestamp already sitting in a user's localStorage.
 */
export function nowStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Mints a call identifier, e.g. `"CS-834521"`.
 *
 * The last six digits of the epoch millisecond clock, so ids repeat roughly
 * every 16 minutes. Adequate here because ids only need to be unique within
 * the 50-call window the dashboard keeps, and they are short enough to read
 * aloud over a radio.
 */
export function createCallId(): string {
  return `${config.callId.prefix}${Date.now().toString().slice(-config.callId.timestampDigits)}`
}
