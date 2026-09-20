import { describe, expect, it } from 'vitest'
import { config } from '@/lib/config'
import { createCallId, formatCount, nowStamp, parseWaitMinutes, randomWaitTime } from '@/lib/format'
import { dispatchProgressPercent } from '@/lib/dispatch'
import { priorityQueueToCsv, toCsv } from '@/lib/csv'
import { formatMessage } from '@/lib/messages'
import { flattenImportantDetails, isQuestionsHeadingIndex } from '@/lib/details'
import type { PriorityCall } from '@/types/call'

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(1234567)).toBe((1234567).toLocaleString())
    expect(formatCount(0)).toBe('0')
  })
})

describe('randomWaitTime / parseWaitMinutes', () => {
  it('round-trips: whatever it formats, parseWaitMinutes can read back', () => {
    for (let i = 0; i < 200; i++) {
      const formatted = randomWaitTime()
      const minutes = parseWaitMinutes(formatted)
      expect(minutes).toBeGreaterThanOrEqual(1)
      expect(minutes).toBeLessThanOrEqual(config.limits.maxWaitMinutes)
      expect(formatted).toBe(`${minutes} ${config.waitTime.unit}`)
    }
  })
})

describe('nowStamp', () => {
  it('formats as YYYY-MM-DD HH:MM:SS', () => {
    expect(nowStamp()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('createCallId', () => {
  it('uses the configured prefix and digit count', () => {
    const id = createCallId()
    expect(id.startsWith(config.callId.prefix)).toBe(true)
    expect(id.slice(config.callId.prefix.length)).toHaveLength(config.callId.timestampDigits)
  })
})

describe('dispatchProgressPercent', () => {
  it('is zero at the moment of dispatch and 50 at the halfway point', () => {
    const start = 1_000_000
    expect(dispatchProgressPercent('10 min', start, start)).toBe(0)
    expect(dispatchProgressPercent('10 min', start, start + 5 * 60_000)).toBe(50)
  })

  it('clamps at 100 rather than growing past arrival', () => {
    const start = 0
    expect(dispatchProgressPercent('1 min', start, 60_000)).toBe(100)
    expect(dispatchProgressPercent('1 min', start, 60 * 60_000)).toBe(100)
  })
})

describe('toCsv', () => {
  it('quotes every field so commas cannot break the columns', () => {
    expect(toCsv([['a', 'b,c']])).toBe('"a","b,c"')
  })

  it('doubles embedded quotes', () => {
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""')
  })

  it('emits a header row followed by one row per call', () => {
    const calls: PriorityCall[] = [
      { id: 'CS-000001', level: 'High', waitTime: '3 min' },
      { id: 'CS-000002', level: 'Low', waitTime: '9 min' },
    ]
    expect(priorityQueueToCsv(calls).split('\n')).toEqual([
      '"id","level","waitTime"',
      '"CS-000001","High","3 min"',
      '"CS-000002","Low","9 min"',
    ])
  })

  it('still emits the header for an empty queue', () => {
    expect(priorityQueueToCsv([])).toBe('"id","level","waitTime"')
  })
})

describe('formatMessage', () => {
  it('substitutes every occurrence of a placeholder', () => {
    expect(formatMessage('{{id}} and {{id}}', { id: 'X' })).toBe('X and X')
  })

  it('leaves an unknown placeholder visible instead of blanking it', () => {
    // A hole in the sentence is easy to miss; a literal {{level}} is not.
    expect(formatMessage('Call {{id}} is {{level}}', { id: 'X' })).toBe('Call X is {{level}}')
  })

  it('is a no-op for a template with no placeholders', () => {
    expect(formatMessage('Exported CSV.')).toBe('Exported CSV.')
  })
})

describe('flattenImportantDetails', () => {
  it('flattens, splits on newlines and trims', () => {
    expect(flattenImportantDetails({ 0: ['  address: 12 Elm  \nname: Ada'] })).toEqual([
      'address: 12 Elm',
      'name: Ada',
    ])
  })

  it('drops short fragments so stray punctuation does not render as empty bullets', () => {
    expect(flattenImportantDetails({ 0: ['*', '-', 'ok', 'a real detail'] })).toEqual([
      'a real detail',
    ])
  })

  it('handles an empty record', () => {
    expect(flattenImportantDetails({})).toEqual([])
  })
})

describe('isQuestionsHeadingIndex', () => {
  it('marks exactly one position, the configured one', () => {
    const flags = [0, 1, 2, 3].map(isQuestionsHeadingIndex)
    expect(flags.filter(Boolean)).toHaveLength(1)
    expect(flags[config.limits.questionsHeadingIndex]).toBe(true)
  })
})
