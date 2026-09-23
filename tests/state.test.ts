import { describe, expect, it } from 'vitest'
import { computeCallStats } from '@/lib/stats'
import { ALL_FILTER, priorityFilters, priorityLevels } from '@/lib/classification'
import { SETTINGS_ACTIONS, settingsContent } from '@/lib/content'
import { VIEW_NAMES, isViewName } from '@/types/view'
import { isThemeName, theme } from '@/lib/theme'
import type { PriorityCall } from '@/types/call'

/** Builds a queue with the given levels, ids being irrelevant to counting. */
function queue(...levels: PriorityCall['level'][]): PriorityCall[] {
  return levels.map((level, index) => ({
    id: `CS-00000${index}`,
    level,
    waitTime: '1 min',
  }))
}

describe('computeCallStats', () => {
  it('counts each level and the total', () => {
    expect(computeCallStats(queue('High', 'High', 'Medium', 'Low'))).toEqual({
      total: 4,
      high: 2,
      medium: 1,
      low: 1,
    })
  })

  it('reports zeros rather than missing keys for an empty queue', () => {
    // The Home tiles read these by key. A missing key would render undefined.
    expect(computeCallStats([])).toEqual({ total: 0, high: 0, medium: 0, low: 0 })
  })

  it('produces one key per configured level, plus total', () => {
    // Guards the derivation. If someone adds a level to
    // data/classification.json, it must come back with a counter.
    const stats = computeCallStats([])
    expect(Object.keys(stats).sort()).toEqual(
      [...priorityLevels.map(level => level.toLowerCase()), 'total'].sort()
    )
  })

  it('has counts that sum to the total', () => {
    const stats = computeCallStats(queue('High', 'Medium', 'Medium', 'Low', 'Low'))
    const perLevel = priorityLevels.reduce(
      (sum, level) => sum + stats[level.toLowerCase() as keyof typeof stats],
      0
    )
    expect(perLevel).toBe(stats.total)
  })
})

describe('priorityFilters', () => {
  it('leads with the All sentinel and then every level in order', () => {
    expect(priorityFilters).toEqual([ALL_FILTER, ...priorityLevels])
  })

  it('has no duplicate chips', () => {
    expect(new Set(priorityFilters).size).toBe(priorityFilters.length)
  })
})

describe('isViewName', () => {
  it('accepts every declared view', () => {
    for (const name of VIEW_NAMES) expect(isViewName(name)).toBe(true)
  })

  it('rejects a renamed or hand-edited stored value', () => {
    // This is the localStorage case. Before the guard, an unknown name was
    // restored and rendered a blank screen.
    expect(isViewName('dashboard')).toBe(false)
    expect(isViewName('')).toBe(false)
    expect(isViewName(null)).toBe(false)
    expect(isViewName(undefined)).toBe(false)
    expect(isViewName(0)).toBe(false)
  })

  it('is case sensitive, matching how the value is stored', () => {
    expect(isViewName('Home')).toBe(false)
  })
})

describe('isThemeName', () => {
  it('accepts the schemes the token file defines', () => {
    for (const name of Object.keys(theme)) expect(isThemeName(name)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isThemeName('sepia')).toBe(false)
    expect(isThemeName(null)).toBe(false)
  })

  it('does not accept inherited Object properties', () => {
    // Object.hasOwn rather than `in`, so prototype keys cannot sneak through.
    expect(isThemeName('toString')).toBe(false)
    expect(isThemeName('constructor')).toBe(false)
  })
})

describe('settings rows', () => {
  it('only names actions the view knows how to run', () => {
    // lib/content.ts throws at import if this is violated, so reaching this
    // assertion at all is most of the test.
    for (const row of settingsContent.rows) {
      expect(SETTINGS_ACTIONS).toContain(row.action)
    }
  })

  it('has one row per action, so no action is silently unreachable', () => {
    const actions = settingsContent.rows.map(row => row.action)
    expect(new Set(actions).size).toBe(actions.length)
    expect([...actions].sort()).toEqual([...SETTINGS_ACTIONS].sort())
  })

  it('gives every non-theme row a label and a style for its button', () => {
    for (const row of settingsContent.rows) {
      if (row.action === 'theme') continue
      expect(row.buttonLabel).toBeTruthy()
      expect(row.buttonStyle).toBeTruthy()
    }
  })
})
