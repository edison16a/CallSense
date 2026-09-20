/**
 * Triage levels a call can be assigned, ordered most to least urgent.
 *
 * Kept as a string union rather than an enum so the values round-trip through
 * localStorage and CSV export unchanged, and so they match the strings in
 * data/classification.json without a conversion layer.
 */
export type PriorityLevel = 'High' | 'Medium' | 'Low'

/**
 * What the classifier can return. `Unknown` is distinct from the three real
 * levels: it means "the model gave us nothing usable", which is the signal the
 * caller needs in order to fall back to keyword matching. Collapsing it into
 * `Low` would silently downgrade calls whenever the API is unreachable.
 */
export type ClassificationResult = PriorityLevel | 'Unknown'

/** A call waiting in the dispatch queue. */
export interface PriorityCall {
  /** Human-readable identifier, e.g. `CS-123456`. Also the key linking to CurrentCall. */
  id: string
  level: PriorityLevel
  /** Pre-formatted, e.g. `"7 min"`. Stored formatted because it is displayed far more often than it is parsed. */
  waitTime: string
}

/** A completed call and the transcript captured for it. */
export interface CurrentCall {
  /** Matches the `id` of the corresponding PriorityCall. */
  id: string
  /** Captured lines plus the appended danger-level and timestamp footers. */
  transcript: string[]
}

/** The filter chips above the priority queue: every level, plus an "All" escape hatch. */
export type PriorityFilter = PriorityLevel | 'All'

/** Counts shown on the Home dashboard tiles. Keys match `metric` in data/content.json. */
export interface CallStats {
  total: number
  high: number
  medium: number
  low: number
}
