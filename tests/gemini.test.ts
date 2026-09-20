import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPromptParts, candidateText } from '@/lib/gemini/client'
import {
  askComfortingQuestions,
  askFurtherQuestions,
  askImportantDetails,
  classifyTranscript,
} from '@/lib/gemini/analysis'

/** Replaces global fetch with one that resolves to `payload`. */
function mockResponse(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => payload })))
}

/** Replaces global fetch with one that rejects, simulating an unreachable API. */
function mockNetworkFailure() {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new Error('network down')
  }))
}

/** The reply shape Gemini actually returns: content is an object with parts. */
function reply(text: string) {
  return { candidates: [{ content: { role: 'model', parts: [{ text }] } }] }
}

afterEach(() => vi.unstubAllGlobals())

describe('buildPromptParts', () => {
  it('substitutes the transcript into every slot', () => {
    const parts = buildPromptParts('classify', 'Caller: there is a fire')
    expect(parts[0].text).toContain('Caller: there is a fire')
    expect(parts.every(part => !part.text?.includes('{{transcript}}'))).toBe(true)
  })

  it('keeps the parts array ordered, since order changes the model reply', () => {
    const parts = buildPromptParts('importantDetails', 'x')
    expect(parts).toHaveLength(3)
    expect(parts[0].text).toContain('important for law enforcement')
    expect(parts[2].text).toContain('Transcript:')
  })
})

describe('candidateText', () => {
  it('reads text out of the parts array', () => {
    expect(candidateText(reply('hello'))).toBe('hello')
  })

  it('joins multiple parts instead of truncating to the first', () => {
    const response = {
      candidates: [{ content: { parts: [{ text: 'one ' }, { text: 'two' }] } }],
    }
    expect(candidateText(response)).toBe('one two')
  })

  it('never stringifies the content object', () => {
    // Regression test. The previous implementation called String() on the
    // content object, so the dispatcher was shown "[object Object]" as their
    // suggested questions.
    expect(candidateText(reply('real text'))).not.toContain('[object Object]')
  })

  it('accepts a bare string and an absent candidate', () => {
    expect(candidateText({ candidates: [{ content: 'plain' }] })).toBe('plain')
    expect(candidateText({})).toBe('')
  })
})

describe('classifyTranscript', () => {
  it('returns the level named in the reply', async () => {
    mockResponse(reply('This is HIGH priority'))
    await expect(classifyTranscript('shots fired')).resolves.toBe('High')
  })

  it('defaults to Medium when the reply carries no text', async () => {
    // The empty-response stand-in is the string "medium", so an empty reply
    // is classified Medium rather than Unknown.
    mockResponse({ candidates: [] })
    await expect(classifyTranscript('anything')).resolves.toBe('Medium')
  })

  it('returns Unknown when the API is unreachable, so the caller can fall back', async () => {
    mockNetworkFailure()
    await expect(classifyTranscript('shots fired')).resolves.toBe('Unknown')
  })
})

describe('question helpers', () => {
  it('splits a reply into trimmed, non-empty lines', async () => {
    mockResponse(reply('Are you safe?\n- Is anyone hurt?\n\n• Where are you?'))
    await expect(askFurtherQuestions('x')).resolves.toEqual([
      'Are you safe?',
      'Is anyone hurt?',
      'Where are you?',
    ])
  })

  it('returns an empty list on failure rather than throwing mid-call', async () => {
    mockNetworkFailure()
    await expect(askFurtherQuestions('x')).resolves.toEqual([])
    await expect(askComfortingQuestions('x')).resolves.toEqual([])
  })
})

describe('askImportantDetails', () => {
  it('skips the request entirely for an empty transcript', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(askImportantDetails('   ')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('unpacks the parts object', async () => {
    mockResponse(reply('123 Pine Ave'))
    await expect(askImportantDetails('x')).resolves.toEqual(['123 Pine Ave'])
  })

  it('tolerates a bare array of details', async () => {
    mockResponse({ candidates: [{ content: ['name: Ada', 'address: 12 Elm'] }] })
    await expect(askImportantDetails('x')).resolves.toEqual(['name: Ada', 'address: 12 Elm'])
  })

  it('splits a bare string on newlines', async () => {
    mockResponse({ candidates: [{ content: 'name: Ada\n\naddress: 12 Elm' }] })
    await expect(askImportantDetails('x')).resolves.toEqual(['name: Ada', 'address: 12 Elm'])
  })

  it('falls back to the output.content field', async () => {
    mockResponse({ candidates: [{ output: { content: 'from output' } }] })
    await expect(askImportantDetails('x')).resolves.toEqual(['from output'])
  })
})
