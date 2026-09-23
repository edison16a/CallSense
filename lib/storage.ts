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

/**
 * Reads a raw string, returning null if storage cannot be reached at all.
 *
 * For readers that have no enclosing guard, which means anything running
 * during render rather than inside an effect. Browsers throw a SecurityError
 * on any localStorage access when site data is blocked, so an unguarded read
 * in a state initialiser takes down the whole app before it paints.
 */
export function readRawOrNull(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Storage disabled or blocked by the browser. Caller falls back to a default.
    return null
  }
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
