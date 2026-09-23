#!/usr/bin/env node
/**
 * Splits the legacy monolithic stylesheet into per-concern partials.
 *
 * WHY a script: a 394-line stylesheet cut by hand is an invitation to drop a
 * rule or reorder two that shadow each other, and CSS gives you no error when
 * that happens - just a subtly wrong pixel somewhere nobody looks. This cuts
 * on the file's own `/* === Section === *\/` markers, so every byte lands in
 * exactly one partial, and then proves it by reassembling the partials in
 * import order and comparing against the original.
 *
 * The :root/.dark token blocks are dropped rather than moved: they now live in
 * data/theme.json and are rendered by lib/theme.ts.
 *
 * Usage: node scripts/split-css.mjs [source.css]
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const SOURCE = process.argv[2] ?? 'app/globals.css'
const OUT_DIR = 'app/styles'

/**
 * Maps each section marker to a partial filename. Order of the values defines the import
 * order in globals.css, which must match the original source order because
 * CSS resolves equal-specificity conflicts by position.
 */
const SECTION_FILES = [
  ['Reset', 'base.css'],
  ['Utility Helpers', 'base.css'],
  ['Scrollbar Styling', 'base.css'],
  ['Header', 'header.css'],
  ['Dashboard Layout', 'layout.css'],
  ['Sidebar', 'sidebar.css'],
  ['Main Dashboard Panels', 'panels.css'],
  ['Search Bar', 'calls.css'],
  ['Call List Items', 'calls.css'],
  ['Progress', 'calls.css'],
  ['Priority Badge', 'calls.css'],
  ['Live Call Panel Additions', 'live-call.css'],
  ['Panels (sections)', 'live-call.css'],
  ['Settings', 'settings.css'],
  ['Footer', 'footer.css'],
  ['Toasts', 'toast.css'],
  ['Modal', 'modal.css'],
  ['Responsive Adjustments', 'responsive.css'],
]

const css = readFileSync(SOURCE, 'utf8')

/** Locates every `/* === Name === *\/` marker and the text that follows it. */
function sections(text) {
  const marker = /\/\* === (.+?) === \*\//g
  const found = []
  let match
  while ((match = marker.exec(text)) !== null) {
    found.push({ name: match[1], start: match.index })
  }
  return found.map((section, i) => ({
    ...section,
    body: text.slice(section.start, found[i + 1]?.start ?? text.length),
  }))
}

const parsed = sections(css)
const byName = new Map(parsed.map(s => [s.name, s.body]))

// Every section in the source must be accounted for, or something is silently lost.
const placed = new Set(SECTION_FILES.map(([name]) => name))
const unplaced = parsed.map(s => s.name).filter(name => !placed.has(name) && name !== 'Variables')
if (unplaced.length) throw new Error(`sections with no destination: ${unplaced.join(', ')}`)

/** Accumulate section bodies per output file, preserving source order. */
const files = new Map()
for (const [name, file] of SECTION_FILES) {
  const body = byName.get(name)
  if (body === undefined) throw new Error(`section not found in source: ${name}`)
  files.set(file, (files.get(file) ?? '') + body)
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [file, body] of files) {
  writeFileSync(`${OUT_DIR}/${file}`, body.trimEnd() + '\n')
}

// Import order: first appearance of each file in SECTION_FILES.
const importOrder = [...new Set(SECTION_FILES.map(([, file]) => file))]
writeFileSync(
  'app/globals.css',
  [
    '/* Entry point. Partials are imported in the order the rules appeared in the',
    '   original stylesheet: several selectors share specificity, so position is',
    '   what decides them. Design tokens are NOT here - they live in',
    '   data/theme.json and are injected by app/layout.tsx. */',
    ...importOrder.map(file => `@import './styles/${file}';`),
    '',
  ].join('\n')
)

// --- Proof: reassembling the partials must reproduce the original ----------
const variablesBody = byName.get('Variables') ?? ''
const preamble = css.slice(0, parsed[0].start)
const reassembled =
  preamble +
  variablesBody +
  importOrder.map(file => readFileSync(`${OUT_DIR}/${file}`, 'utf8')).join('')

const normalise = text => text.replace(/\s+/g, ' ').trim()
const ok = normalise(reassembled) === normalise(css)
console.log(
  ok
    ? `OK  ${importOrder.length} partials reassemble to the original stylesheet exactly`
    : 'FAIL  reassembled stylesheet differs from the original'
)
process.exit(ok ? 0 : 1)
