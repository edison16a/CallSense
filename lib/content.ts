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
export const settingsContent = content.settings
export const modalContent = content.modal

export const homeContent = {
  ...content.home,
  primaryCta: content.home.primaryCta as HomeCta,
  secondaryCta: content.home.secondaryCta as HomeCta,
  stats: content.home.stats as readonly StatTile[],
}
