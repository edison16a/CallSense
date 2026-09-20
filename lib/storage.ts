/**
 * Thin localStorage helpers.
 *
 * Reads deliberately do NOT swallow errors; writes do. That asymmetry matches
 * how the dashboard uses them and is worth keeping: hydration reads several
 * keys under one try/catch so that a single corrupt entry abandons the whole
 * restore rather than leaving the queue and the transcripts half-restored and
 * disagreeing with each other. A failed write, by contrast, is never worth
 * interrupting a live call for - the data is still in memory.
 */

/** Reads a raw string, or null when absent. Throws if storage is unavailable. */
export function readRaw(key: string): string | null {
  return localStorage.getItem(key)
}

/** Writes a string, ignoring quota and private-mode failures. */
export function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage full, disabled, or blocked by the browser. Non-fatal by design.
  }
}

/** Serialises and writes a value, ignoring failures. */
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // See writeRaw.
  }
}
