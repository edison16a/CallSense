import { describe, expect, it } from 'vitest'
import {
  UNKNOWN_LEVEL,
  levelFromResponseText,
  levelFromTranscriptKeywords,
  priorityFilters,
  priorityLevels,
} from '@/lib/classification'

describe('levelFromResponseText', () => {
  it('reads the level out of a conversational reply', () => {
    expect(levelFromResponseText('This is a high priority call.')).toBe('High')
    expect(levelFromResponseText('medium')).toBe('Medium')
    expect(levelFromResponseText('I would rate this LOW priority')).toBe('Low')
  })

  it('is case insensitive', () => {
    expect(levelFromResponseText('HIGH')).toBe('High')
  })

  it('resolves a hedging reply to the most severe level mentioned', () => {
    // Guards the ordering in data/classification.json. A reply that names
    // several levels must round up, not down - under-triaging an emergency is
    // the failure that matters here.
    expect(levelFromResponseText('somewhere between low and high')).toBe('High')
    expect(levelFromResponseText('low, possibly medium')).toBe('Medium')
  })

  it('returns Unknown rather than guessing when no level is named', () => {
    expect(levelFromResponseText('I am not sure what to make of this')).toBe(UNKNOWN_LEVEL)
    expect(levelFromResponseText('')).toBe(UNKNOWN_LEVEL)
  })
})

describe('levelFromTranscriptKeywords', () => {
  it('matches weapon and fire keywords as High', () => {
    expect(levelFromTranscriptKeywords('there is smoke coming from the building')).toBe('High')
    expect(levelFromTranscriptKeywords('He has a GUN')).toBe('High')
  })

  it('matches incident keywords as Medium', () => {
    expect(levelFromTranscriptKeywords('I witnessed a car accident')).toBe('Medium')
    expect(levelFromTranscriptKeywords('my son is missing')).toBe('Medium')
  })

  it('prefers the more severe rule when a transcript matches several', () => {
    expect(levelFromTranscriptKeywords('an accident and then gunfire')).toBe('High')
  })

  it('falls through to Low', () => {
    expect(levelFromTranscriptKeywords('my cat is stuck on the roof')).toBe('Low')
  })
})

describe('priorityFilters', () => {
  it('is derived from the level list rather than hard-coded', () => {
    expect(priorityFilters).toEqual(['All', ...priorityLevels])
  })
})
