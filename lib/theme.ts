import themeData from '@/data/theme.json'

/**
 * A flat map of CSS custom property name -> value, e.g. `--primary-blue`.
 * Keys keep their leading `--` so the JSON reads the same as the CSS it
 * replaces and a reviewer can grep for a token name across both.
 */
export type TokenMap = Readonly<Record<string, string>>

/**
 * The full design-token set: `light` populates `:root`, `dark` is the subset
 * re-declared under `.dark`. Only the tokens that actually differ between
 * schemes appear in `dark` — everything else inherits from `:root`.
 */
export interface Theme {
  readonly light: TokenMap
  readonly dark: TokenMap
}

/** The design tokens, loaded from data/theme.json. Adding a token is a JSON edit. */
export const theme: Theme = { light: themeData.light, dark: themeData.dark }

/** The two colour schemes the UI can be in. Used for the toggle and persistence. */
export type ThemeName = keyof Theme

/** Renders one token map as the body of a CSS rule. */
function renderTokens(tokens: TokenMap): string {
  return Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')
}

/**
 * Serialises the token data into a stylesheet.
 *
 * Order matters and is load-bearing: `:root` and `.dark` have identical CSS
 * specificity (0,1,0), so the winner is decided purely by source order. `.dark`
 * must come second or dark mode silently does nothing. The legacy stylesheet
 * relied on the same ordering; emitting both rules from one function makes the
 * dependency explicit instead of an accident of file layout.
 */
export function renderThemeCss(source: Theme = theme): string {
  return `:root {\n${renderTokens(source.light)}\n}\n\n.dark {\n${renderTokens(source.dark)}\n}\n`
}
