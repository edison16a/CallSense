import {
  UNKNOWN_LEVEL,
  emptyResponseText,
  levelFromResponseText,
} from '@/lib/classification'
import {
  candidateText,
  firstPartText,
  generateContent,
  type GeminiContent,
  type GeminiPart,
  type GeminiResponse,
} from '@/lib/gemini/client'
import type { ClassificationResult } from '@/types/call'

/**
 * Splits a free-text reply into displayable bullet lines.
 *
 * The separator set (newlines, bullet, en dash, em dash, hyphen) mirrors the
 * ways the model formats lists when asked not to use formatting. Note that
 * splitting on a bare hyphen also breaks hyphenated words apart; that is the
 * pre-existing behaviour and is preserved here rather than quietly tightened,
 * because changing it changes what dispatchers see.
 */
function splitIntoLines(reply: string): string[] {
  return String(reply)
    .split(/\r?\n|•|–|—|-/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Assigns a danger level to a transcript.
 *
 * Returns `Unknown` on any failure so the caller can fall back to keyword
 * matching. Returning `Low` instead would look like a real classification and
 * silently bury urgent calls whenever the API is down.
 */
export async function classifyTranscript(text: string): Promise<ClassificationResult> {
  try {
    const response = await generateContent('classify', text)
    const reply = (firstPartText(response) || emptyResponseText).toLowerCase()
    return levelFromResponseText(reply)
  } catch {
    return UNKNOWN_LEVEL
  }
}

/** Suggested reassuring questions for the dispatcher to ask. */
export async function askComfortingQuestions(text: string): Promise<string[]> {
  try {
    const response = await generateContent('comfortingQuestions', text)
    return splitIntoLines(candidateText(response))
  } catch {
    return []
  }
}

/** Five safety/reassurance questions, requested on demand from the Live Call screen. */
export async function askFurtherQuestions(text: string): Promise<string[]> {
  try {
    const response = await generateContent('furtherQuestions', text)
    return splitIntoLines(candidateText(response))
  } catch {
    return []
  }
}

/**
 * Pulls law-enforcement-relevant details (address, name, what is happening)
 * out of a transcript, followed by clarifying questions.
 *
 * Unlike the question helpers this one handles every response shape Gemini has
 * been observed to return - a `content` object with `parts`, a bare array, or
 * a bare string - because a malformed payload here costs the dispatcher the
 * address of an incident. The empty-transcript guard avoids spending a request
 * on nothing.
 */
export async function askImportantDetails(text: string): Promise<string[]> {
  if (!text || !text.trim()) return []
  try {
    const response: GeminiResponse = await generateContent('importantDetails', text)

    const raw = response.candidates?.[0]?.content ?? response.candidates?.[0]?.output?.content ?? ''

    if (raw && typeof raw === 'object' && Array.isArray((raw as GeminiContent).parts)) {
      const parts = (raw as GeminiContent).parts as GeminiPart[]
      return parts.map(part => part.text?.trim() ?? '').filter(Boolean)
    }

    if (Array.isArray(raw)) {
      return raw.map(item => String(item).trim()).filter(s => s.length > 0)
    }

    const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw)
    return rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
  } catch (error) {
    console.error('askImportantDetails failed', error)
    return []
  }
}
