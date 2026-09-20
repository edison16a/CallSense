#!/usr/bin/env node
/**
 * Replaces standalone colour literals in the CSS partials with theme tokens,
 * adding the tokens to data/theme.json.
 *
 * WHY a script: nineteen substitutions across twelve files, where a typo
 * produces a valid-but-wrong colour that no tool will flag. The script proves
 * its own work by expanding every token back to its literal and checking the
 * result is byte-identical to the input.
 *
 * WHAT IS DELIBERATELY LEFT ALONE: the rgba() values inside gradients and
 * box-shadows. Those are alpha overlays that only mean anything as part of the
 * effect they belong to - promoting each one to a named token would produce
 * twenty tokens nobody could name usefully, and the composite effects they
 * build are already tokenised where it matters (--brand-grad, --shadow-*).
 *
 * New tokens go into the LIGHT map only. That is required for behaviour to be
 * preserved: these literals were never overridden for dark mode, so adding
 * them to the dark map would change how the app looks with the theme toggled.
 *
 * Usage: node scripts/tokenize-colors.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const STYLES_DIR = 'app/styles'

/** literal -> token name. Names describe the role, not the hue. */
const TOKENS = {
  '#f8fbff': '--header-text',
  '#eaf1ff': '--logo-text',
  '#edf3ff': '--chip-text',
  '#fff': '--pure-white',
  '#111827': '--ink',
  '#fee2e2': '--danger-surface',
  '#991b1b': '--danger-text',
  '#fecaca': '--danger-border',
  '#eef2ff': '--progress-track',
  '#dbeafe': '--progress-track-border',
  '#60a5fa': '--progress-from',
  '#2563eb': '--progress-to',
  '#DC2626': '--badge-high',
  '#FBBF24': '--badge-medium',
  '#16A34A': '--badge-low',
  '#e0f2fe': '--classification-surface',
  '#bae6fd': '--classification-border',
  '#e5e7eb': '--skeleton-base',
  '#f3f4f6': '--skeleton-highlight',
  'rgba(2,6,23,0.55)': '--modal-scrim',
}

/**
 * Matches a literal only where it is a complete colour value.
 *
 * The lookahead matters: `#fff` is a prefix of longer hex colours, so a naive
 * replace would corrupt `#fff000` into `var(--pure-white)000`.
 */
function literalPattern(literal) {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return literal.startsWith('#') ? new RegExp(`${escaped}(?![0-9a-fA-F])`, 'g') : new RegExp(escaped, 'g')
}

const files = readdirSync(STYLES_DIR).filter(name => name.endsWith('.css'))
const before = new Map(files.map(name => [name, readFileSync(`${STYLES_DIR}/${name}`, 'utf8')]))

let replacements = 0
const used = new Set()
for (const [name, original] of before) {
  let text = original
  for (const [literal, token] of Object.entries(TOKENS)) {
    text = text.replace(literalPattern(literal), () => {
      replacements++
      used.add(token)
      return `var(${token})`
    })
  }
  writeFileSync(`${STYLES_DIR}/${name}`, text)
}

const unused = Object.values(TOKENS).filter(token => !used.has(token))
if (unused.length) throw new Error(`tokens that matched nothing: ${unused.join(', ')}`)

// Append to the light map only; see the note at the top of this file.
const theme = JSON.parse(readFileSync('data/theme.json', 'utf8'))
for (const [literal, token] of Object.entries(TOKENS)) theme.light[token] = literal
const collides = Object.keys(TOKENS).map(l => TOKENS[l]).filter(token => token in theme.dark)
if (collides.length) throw new Error(`new tokens must not be overridden in dark: ${collides.join(', ')}`)
writeFileSync('data/theme.json', `${JSON.stringify(theme, null, 2)}\n`)

// --- Proof: expanding the tokens back must reproduce the input exactly -----
let failures = 0
for (const [name, original] of before) {
  let expanded = readFileSync(`${STYLES_DIR}/${name}`, 'utf8')
  for (const [literal, token] of Object.entries(TOKENS)) {
    expanded = expanded.replaceAll(`var(${token})`, literal)
  }
  if (expanded !== original) {
    failures++
    console.log(`FAIL  ${name} does not round-trip`)
  }
}

console.log(
  failures === 0
    ? `OK  ${replacements} literals tokenised across ${files.length} files; all round-trip byte-for-byte`
    : `${failures} files failed to round-trip`
)
process.exit(failures === 0 ? 0 : 1)
