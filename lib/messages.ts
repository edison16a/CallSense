import messages from '@/data/messages.json'

/**
 * Substitutes `{{name}}` placeholders in a template from data/messages.json.
 *
 * Deliberately dumb: no escaping, no conditionals, no pluralisation. These
 * strings go into toasts and transcript lines as plain text, so a full
 * templating dependency would buy nothing. Unmatched placeholders are left
 * in place rather than blanked, which makes a missing value obvious in the UI
 * instead of producing a sentence with a hole in it.
 */
export function formatMessage(template: string, values: Record<string, string> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? values[key] : match
  )
}

/** Toast copy, keyed by the event that raises it. */
export const toastMessages = messages.toasts

/** Lines written into a stored transcript. */
export const transcriptMessages = messages.transcript

/** Text shown in the classification banner on the Live Call screen. */
export const classificationMessages = messages.classification
