import { config } from '@/lib/config'

/**
 * Flattens the model's "important details" reply into display lines.
 *
 * The details are stored as a record keyed by index because the UI once
 * intended to show several analyses at once; today only key 0 is ever
 * populated. Flattening here keeps that historical shape from leaking into
 * the component.
 *
 * The length filter discards fragments of three characters or fewer. That
 * threshold is what stops stray punctuation and list markers - the model
 * emits them despite being asked not to use formatting - from rendering as
 * empty bullets.
 */
export function flattenImportantDetails(details: Record<number, string[]>): string[] {
  return Object.values(details)
    .flat()
    .filter(detail => typeof detail === 'string' && detail.trim().length > config.limits.minImportantDetailLength)
    .flatMap(detail =>
      detail
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    )
}

/**
 * Whether the "Questions:" subheading belongs before this line.
 *
 * The prompt asks for details first and clarifying questions second, but the
 * reply is unstructured text, so the split point is guessed positionally:
 * everything from the second line on is treated as questions. Fragile by
 * nature, and preserved as-is because changing it changes what dispatchers
 * read mid-call.
 */
export function isQuestionsHeadingIndex(index: number): boolean {
  return index === config.limits.questionsHeadingIndex
}
