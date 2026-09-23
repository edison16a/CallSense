import navigation from '@/data/navigation.json'
import { VIEW_NAMES, isViewName, type NavItem, type ViewName } from '@/types/view'

/**
 * The sidebar, loaded from data/navigation.json.
 *
 * Validated eagerly at module load rather than lazily at render: an unknown
 * `view` would otherwise produce a nav button that quietly renders nothing
 * when clicked, which is far harder to diagnose than a startup error naming
 * the offending entry.
 */
export const navItems: readonly NavItem[] = navigation.items.map(item => {
  if (!isViewName(item.view)) {
    throw new Error(
      `data/navigation.json: unknown view "${item.view}". Expected one of ${VIEW_NAMES.join(', ')}.`
    )
  }
  return { ...item, view: item.view }
})

/** Shortcut key for starting/stopping the microphone. Not a view, so it lives outside `items`. */
export const toggleListeningShortcut = navigation.toggleListeningShortcut

/**
 * Maps a pressed key to the view it selects.
 *
 * Derived from `navItems` rather than written out again: the previous code had
 * the mapping from key to view as a separate if-chain, so adding a screen meant
 * editing two lists and nothing complained if you edited only one.
 */
export const shortcutToView: ReadonlyMap<string, ViewName> = new Map(
  navItems.map(item => [item.shortcut, item.view])
)

/**
 * The hint line at the top of the sidebar, e.g. `"H / L / P / C / S"`.
 * Previously a hard-coded string that could disagree with the real shortcuts.
 */
export const shortcutHint: string = navItems
  .map(item => item.shortcut.toUpperCase())
  .join(' / ')
