#!/usr/bin/env node
/**
 * Proves the extracted copy is faithful to the pre-refactor monolith.
 *
 * WHY: data/content.json holds ~70 strings lifted out of JSX. A single
 * transcription slip (a dropped emoji variation selector, a changed ellipsis,
 * a stray double space) would silently alter the UI, and nothing in the type
 * system would catch it. This walks every leaf string in the extracted data
 * files and asserts it occurs verbatim in the original app/page.tsx.
 *
 * Multi-line JSX text nodes are the one place where "verbatim" needs care:
 * JSX collapses interior newlines and indentation into a single space, so the
 * JSON stores the collapsed form. We therefore also collapse the original
 * source before searching.
 *
 * Usage: node scripts/verify-content.mjs [git-rev]
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

/** Commit holding the monolith, i.e. the last commit before the refactor. */
const REV = process.argv[2] ?? '8db7918'

// layout.tsx as well as page.tsx: the document metadata strings were extracted
// from the root layout, not the dashboard.
const original = ['app/page.tsx', 'app/layout.tsx']
  .map(file => execSync(`git show ${REV}:${file}`, { encoding: 'utf8' }))
  .join('\n')
/** Whitespace-collapsed copy, so multi-line JSX text nodes can be matched. */
const collapsed = original.replace(/\s+/g, ' ')

/** Strings that are legitimately absent from page.tsx, with the reason why. */
const EXEMPT = new Map([
  // Assembled at render time as `© {year} Call Sense`; the two halves are
  // stored separately so the year stays dynamic.
  ['©', 'rendered as part of the footer copyright line'],
  // Stored without the interpolation, which page.tsx spells as `- ${id}`.
  ['Call Details - ', 'title prefix, interpolated with the call id'],
  // Tone/metric/action/view keys are structural, not copy.
  ['', 'empty tone means "no modifier class"'],
])

/** Keys whose values are identifiers wiring data to code, not user-facing copy. */
const STRUCTURAL_KEYS = new Set([
  '$comment', 'metric', 'tone', 'view', 'action', 'buttonStyle', 'value', 'shortcut',
  'toggleListeningShortcut', 'baseUrl', 'model', 'method', 'level', 'pattern', 'keyword',
])

let checked = 0
let failed = 0

/** Recursively visits every string leaf, skipping structural keys. */
function walk(node, path, file) {
  if (typeof node === 'string') {
    if (EXEMPT.has(node)) return
    checked++
    if (!original.includes(node) && !collapsed.includes(node.replace(/\s+/g, ' '))) {
      failed++
      console.log(`FAIL ${file} ${path}\n     ${JSON.stringify(node)}`)
    }
    return
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}[${i}]`, file))
    return
  }
  if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node)) {
      if (STRUCTURAL_KEYS.has(key)) continue
      walk(child, `${path}.${key}`, file)
    }
  }
}

for (const file of ['data/content.json', 'data/navigation.json', 'data/demo-transcripts.json']) {
  walk(JSON.parse(readFileSync(file, 'utf8')), '', file)
}

console.log(
  failed === 0
    ? `OK  ${checked} extracted strings all occur verbatim in ${REV}:app/{page,layout}.tsx`
    : `\n${failed} of ${checked} strings did NOT match`
)
process.exit(failed === 0 ? 0 : 1)
