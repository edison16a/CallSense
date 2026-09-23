import content from '@/data/content.json'
import type { CallStats } from '@/types/call'
import type { ViewName } from '@/types/view'

/** A Home dashboard tile: a label, which stat it reads, and an optional colour modifier. */
export interface StatTile {
  label: string
  /** Key into CallStats. */
  metric: keyof CallStats
  /** CSS modifier appended to `.stat-value` (`red`, `amber`, `green`, or empty for the default blue). */
  tone: string
}

/** A Home call-to-action button and the view it navigates to. */
export interface HomeCta {
  label: string
  view: ViewName
}

/**
 * All user-facing copy, loaded from data/content.json.
 *
 * Re-exported by section rather than as one blob so a component imports only
 * the strings it renders. The `as` casts narrow JSON's inferred `string` to the
 * unions the components expect; the shapes themselves are checked by tsc
 * against the interfaces above.
 */
export const headerContent = content.header
export const sidebarContent = content.sidebar
export const footerContent = content.footer
export const priorityContent = content.priority
export const currentContent = content.current
export const liveContent = content.live
/**
 * The behaviours a settings row can name.
 *
 * Declared as a runtime list so data/content.json can be checked against it.
 * A row naming an unknown action used to render a button whose onClick was
 * undefined: it looked enabled, did nothing when pressed, and reported
 * nothing anywhere.
 */
export const SETTINGS_ACTIONS = ['theme', 'export', 'demo', 'clear'] as const

/** One settings row's behaviour. */
export type SettingsAction = (typeof SETTINGS_ACTIONS)[number]

/** Every settings row except the theme dropdown, which is not a plain button. */
export type SettingsButtonAction = Exclude<SettingsAction, 'theme'>

/** A settings row, with its action narrowed and validated. */
export interface SettingsRow {
  action: SettingsAction
  label: string
  description: string
  buttonLabel?: string
  buttonStyle?: string
  options?: readonly { value: string; label: string }[]
}

export const settingsContent = {
  ...content.settings,
  rows: content.settings.rows.map(row => {
    if (!(SETTINGS_ACTIONS as readonly string[]).includes(row.action)) {
      throw new Error(
        `data/content.json: unknown settings action "${row.action}". ` +
          `Expected one of ${SETTINGS_ACTIONS.join(', ')}.`
      )
    }
    return row as SettingsRow
  }) as readonly SettingsRow[],
}
export const modalContent = content.modal

export const homeContent = {
  ...content.home,
  primaryCta: content.home.primaryCta as HomeCta,
  secondaryCta: content.home.secondaryCta as HomeCta,
  stats: content.home.stats as readonly StatTile[],
}
