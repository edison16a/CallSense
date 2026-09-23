/**
 * The dashboard screens.
 *
 * Declared as a runtime array first, with the type derived from it, because
 * both forms are needed and keeping them as two hand-written lists meant they
 * could disagree. lib/navigation.ts used to carry its own copy of exactly
 * these five strings purely so it could validate the data file at runtime,
 * since a TypeScript union does not exist once the code is compiled.
 *
 * This is a single-page app with no router: `view` is component state,
 * persisted to localStorage so a reload lands where the dispatcher left off.
 */
export const VIEW_NAMES = ['home', 'priority', 'current', 'live', 'settings'] as const

/** One of the dashboard screens. Derived from VIEW_NAMES, never written out again. */
export type ViewName = (typeof VIEW_NAMES)[number]

/**
 * Narrows an untrusted string to a ViewName.
 *
 * Needed in two places where a view name arrives from outside the compiler's
 * reach: entries in data/navigation.json, and the view restored from a
 * previous session's localStorage.
 */
export function isViewName(value: unknown): value is ViewName {
  return typeof value === 'string' && (VIEW_NAMES as readonly string[]).includes(value)
}

/** One sidebar entry, which also declares its own keyboard shortcut. */
export interface NavItem {
  view: ViewName
  /** Emoji glyph rendered in the sidebar. */
  icon: string
  label: string
  /** Single lowercase character. Pressing it outside a text field switches view. */
  shortcut: string
}
