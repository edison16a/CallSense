/**
 * The dashboard screens. This is a single-page app with no router: `view` is
 * component state, persisted to localStorage so a reload lands where the
 * dispatcher left off.
 *
 * The values must stay in sync with the `view` field in data/navigation.json;
 * lib/navigation.ts asserts that at module load so a typo in the data fails
 * loudly instead of rendering a blank screen.
 */
export type ViewName = 'home' | 'priority' | 'current' | 'live' | 'settings'

/** One sidebar entry, which also declares its own keyboard shortcut. */
export interface NavItem {
  view: ViewName
  /** Emoji glyph rendered in the sidebar. */
  icon: string
  label: string
  /** Single lowercase character; pressing it outside a text field switches view. */
  shortcut: string
}
