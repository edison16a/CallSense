import gemini from '@/data/gemini.json'

/**
 * The Gemini API key.
 *
 * KNOWN LIMITATION, preserved as-is by this refactor: these requests are made
 * from a client component, and Next.js only inlines environment variables into
 * client bundles when they are prefixed `NEXT_PUBLIC_`. `GEMINI_KEY` is not, so
 * this is `undefined` in the browser and every request below is rejected by
 * Google. The app therefore always falls back to keyword classification.
 *
 * It is left alone on purpose. The two ways to "fix" it both change how the
 * product works: renaming it to `NEXT_PUBLIC_GEMINI_KEY` would ship the key to
 * every visitor, and proxying through a route handler would add a server
 * component this app does not otherwise have. That is a product decision, not
 * a refactor.
 */
const GEMINI_API_KEY = process.env.GEMINI_KEY

/** Name of a prompt template in data/gemini.json. */
export type PromptName = keyof typeof gemini.prompts

/** One text fragment of a model reply. */
export interface GeminiPart {
  text?: string
}

/** The structured `content` object Gemini actually returns for a candidate. */
export interface GeminiContent {
  parts?: GeminiPart[]
  role?: string
}

/**
 * A single completion candidate.
 *
 * `content` is typed `unknown` rather than `GeminiContent` because the callers
 * defend against three different shapes (object with `parts`, bare array, bare
 * string). Typing it narrowly would make that defensive code look dead when it
 * is in fact the reason the details parser survives an unexpected payload.
 */
export interface GeminiCandidate {
  content?: unknown
  output?: { content?: unknown }
}

/** Minimal view of a generateContent response - only the fields this app reads. */
export interface GeminiResponse {
  candidates?: GeminiCandidate[]
}

/** Full generateContent URL, assembled from the base URL, model and method in data. */
function endpoint(): string {
  return `${gemini.baseUrl}/${gemini.model}:${gemini.method}?key=${GEMINI_API_KEY}`
}

/**
 * Fills a prompt template's `{{transcript}}` slots.
 *
 * Each template is an array of parts, matching Gemini's `contents[].parts`
 * shape, because part ordering affects the reply. Keeping the array structure
 * in data means a prompt can be re-ordered without touching code.
 */
export function buildPromptParts(name: PromptName, transcript: string): GeminiPart[] {
  return gemini.prompts[name].map(part => ({ text: part.replaceAll('{{transcript}}', transcript) }))
}

/**
 * POSTs one prompt template to Gemini and returns the parsed JSON.
 *
 * This replaces four copies of the same fetch boilerplate, which had drifted:
 * they built identical request bodies but each parsed the response slightly
 * differently. Centralising the request half makes the remaining differences
 * in the parsing half visible.
 *
 * Errors are intentionally not caught here. Each caller has its own notion of
 * a safe fallback value (a level, an empty list), so swallowing failures at
 * this layer would hide which one applied.
 */
export async function generateContent(
  name: PromptName,
  transcript: string
): Promise<GeminiResponse> {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: buildPromptParts(name, transcript) }] }),
  })
  return (await res.json()) as GeminiResponse
}

/** Reads the first candidate's first text part, the happy-path reply shape. */
export function firstPartText(response: GeminiResponse): string | undefined {
  const content = response.candidates?.[0]?.content as GeminiContent | undefined
  return content?.parts?.[0]?.text
}

/**
 * Extracts a candidate's reply as plain text.
 *
 * WHAT WAS WRONG BEFORE: two callers read `candidates[0].content` and passed
 * it straight to `String()`. But `content` is an object - `{ parts: [...],
 * role }` - so `String()` produced the literal text "[object Object]", which
 * was then split into lines and rendered to the dispatcher as their suggested
 * questions. The bug survived because the sibling details parser handled the
 * object shape correctly, so the two sat next to each other looking equivalent.
 *
 * Parts are joined rather than taking only the first: a long reply is split
 * across several parts, and reading `parts[0]` alone truncates it.
 */
export function candidateText(response: GeminiResponse): string {
  const content = response.candidates?.[0]?.content
  if (content && typeof content === 'object' && Array.isArray((content as GeminiContent).parts)) {
    return ((content as GeminiContent).parts ?? []).map(part => part.text ?? '').join('')
  }
  if (typeof content === 'string') return content
  return ''
}
