/**
 * Minimal typings for the Web Speech API.
 *
 * The DOM lib does not ship these, and the original code papered over that
 * with `any` at every touch point. Declaring only the members this app uses
 * keeps the surface honest: anything else would be guessing at a spec that
 * browsers implement inconsistently.
 */

/** One alternative transcription of a phrase. */
export interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

/** Indexed alternatives for a single recognised phrase. */
export interface SpeechRecognitionResult {
  readonly length: number
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

/** Array-like list of results, which is why callers reach for Array.from. */
export interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

/**
 * A result callback payload. `resultIndex` is the offset of the first result
 * that changed since the last event, so handlers must slice from it rather
 * than re-reading the whole list.
 */
export interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

/** An error callback payload. `error` is a short machine-readable code. */
export interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

/** The recogniser itself. */
export interface SpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

/** Constructor shape, needed because the global is reached via `window`. */
export type SpeechRecognitionConstructor = new () => SpeechRecognition

/** Both spellings the API ships under: standard, and the WebKit-prefixed original. */
export interface SpeechRecognitionWindow {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}
