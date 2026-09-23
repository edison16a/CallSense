import { priorityLevels } from '@/lib/classification'
import type { CallStats, LevelCountKey, PriorityCall } from '@/types/call'

/**
 * Counts the queue by danger level for the Home dashboard tiles.
 *
 * Built by walking the level list from data/classification.json instead of
 * naming High, Medium and Low in code. The old version filtered three times
 * against three string literals, so a level added to the data file would have
 * had a filter chip and a badge but no counter, and nothing would have
 * complained.
 *
 * Pure and separate from the hook so the counting can be tested directly.
 */
export function computeCallStats(calls: readonly PriorityCall[]): CallStats {
  const counts = Object.fromEntries(
    priorityLevels.map(level => [
      level.toLowerCase(),
      calls.filter(call => call.level === level).length,
    ])
  ) as Record<LevelCountKey, number>

  return { ...counts, total: calls.length }
}
