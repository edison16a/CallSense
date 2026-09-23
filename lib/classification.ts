import classificationData from '@/data/classification.json'
import type { ClassificationResult, PriorityFilter, PriorityLevel } from '@/types/call'

/** The triage levels, most urgent first, as declared in data/classification.json. */
export const priorityLevels = classificationData.levels as readonly PriorityLevel[]

/**
 * The sentinel filter meaning "do not filter".
 *
 * It stays a TypeScript literal rather than moving to a data file, because it
 * is part of the PriorityFilter type and a JSON import widens to `string`.
 * data/content.json briefly carried an `allFilterLabel` copy of this word that
 * nothing read, which is worse than no data: it looked editable and was not.
 * The chip renders the filter value directly, so there is only ever one
 * spelling of it.
 */
export const ALL_FILTER = 'All' as const

/**
 * Filter chips above the priority queue.
 *
 * Derived from `priorityLevels` instead of being written out again. The
 * original code had `['All','High','Medium','Low']` typed inline next to a
 * separate `'High' | 'Medium' | 'Low'` union, so adding a level meant editing
 * both and the compiler could not tell you if you forgot.
 */
export const priorityFilters: readonly PriorityFilter[] = [ALL_FILTER, ...priorityLevels]

/** Level returned when the model reply contains none of the expected keywords. */
export const UNKNOWN_LEVEL = classificationData.unknownLevel as 'Unknown'

/**
 * Maps a model reply onto a level by substring match.
 *
 * Keyword order is significant and comes straight from the data file: "high"
 * is tested before "medium" before "low", so a reply that hedges across
 * several levels resolves to the most severe one. That is the safe direction
 * to err for a dispatch queue, and it is what the original if/else chain did.
 */
export function levelFromResponseText(responseText: string): ClassificationResult {
  const text = responseText.toLowerCase()
  for (const { keyword, level } of classificationData.responseKeywords) {
    if (text.includes(keyword)) return level as PriorityLevel
  }
  return UNKNOWN_LEVEL
}

/** Stand-in used when the API returns no candidate text at all. */
export const emptyResponseText = classificationData.emptyResponseText

/**
 * Assigns a level from transcript keywords alone.
 *
 * This is the offline path: it runs whenever the classifier returns `Unknown`,
 * which in practice is every time the Gemini request fails. Rules are ordered
 * most to least severe and the first match wins.
 */
export function levelFromTranscriptKeywords(transcript: string): PriorityLevel {
  for (const rule of classificationData.keywordFallback) {
    if (new RegExp(rule.pattern, 'i').test(transcript)) return rule.level as PriorityLevel
  }
  return classificationData.keywordFallbackDefault as PriorityLevel
}
