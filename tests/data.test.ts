import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderThemeCss, theme } from '@/lib/theme'
import { navItems, shortcutHint, shortcutToView, toggleListeningShortcut } from '@/lib/navigation'
import { homeContent, settingsContent } from '@/lib/content'
import { config } from '@/lib/config'
import demoData from '@/data/demo-transcripts.json'

/** Parses `--name: value;` declarations out of a CSS rule body, in order. */
function parseDeclarations(css: string): [string, string][] {
  return [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(match => [match[1], match[2].trim()])
}

describe('theme tokens', () => {
  it('regenerates the original :root and .dark blocks exactly', () => {
    // The load-bearing no-op proof for moving the design tokens out of CSS
    // and into JSON. The fixture is a verbatim copy of the pre-refactor
    // blocks, written by scripts/extract-theme.mjs rather than by hand.
    const legacy = readFileSync('tests/fixtures/legacy-theme.css', 'utf8')
    const [legacyRoot, legacyDark] = legacy.split('.dark')
    const generated = renderThemeCss({ light: theme.light, dark: theme.dark })
    const [generatedRoot, generatedDark] = generated.split('.dark')

    const originalTokens = new Map(parseDeclarations(legacyRoot))
    for (const [name, value] of originalTokens) {
      expect(parseDeclarations(generatedRoot)).toContainEqual([name, value])
    }
    expect(parseDeclarations(generatedDark)).toEqual(parseDeclarations(legacyDark))
  })

  it('emits :root before .dark, since equal specificity makes order decisive', () => {
    const css = renderThemeCss()
    expect(css.indexOf(':root')).toBeLessThan(css.indexOf('.dark'))
  })

  it('never overrides a component colour token in dark mode', () => {
    // Component colours (badges, the modal scrim, the skeleton shimmer) were
    // never dark-mode aware. Defining any of them under .dark would silently
    // change the dark theme.
    const componentTokens = ['--badge-high', '--badge-medium', '--badge-low', '--modal-scrim']
    for (const token of componentTokens) {
      expect(theme.light).toHaveProperty(token)
      expect(theme.dark).not.toHaveProperty(token)
    }
  })

  it('has no dark override without a light definition to fall back to', () => {
    for (const name of Object.keys(theme.dark)) {
      expect(theme.light).toHaveProperty(name)
    }
  })
})

describe('navigation data', () => {
  it('gives every view a unique shortcut', () => {
    const shortcuts = navItems.map(item => item.shortcut)
    expect(new Set(shortcuts).size).toBe(shortcuts.length)
  })

  it('does not let a view shortcut shadow the microphone toggle', () => {
    expect(navItems.map(item => item.shortcut)).not.toContain(toggleListeningShortcut)
  })

  it('derives the sidebar hint from the shortcuts themselves', () => {
    expect(shortcutHint).toBe(navItems.map(item => item.shortcut.toUpperCase()).join(' / '))
  })

  it('maps every shortcut to its own view', () => {
    expect(shortcutToView.size).toBe(navItems.length)
    for (const item of navItems) expect(shortcutToView.get(item.shortcut)).toBe(item.view)
  })

  it('uses single lowercase characters, which is what the key handler compares', () => {
    for (const item of navItems) {
      expect(item.shortcut).toHaveLength(1)
      expect(item.shortcut).toBe(item.shortcut.toLowerCase())
    }
  })
})

describe('content data', () => {
  it('points both home CTAs at views that exist', () => {
    const views = navItems.map(item => item.view)
    expect(views).toContain(homeContent.primaryCta.view)
    expect(views).toContain(homeContent.secondaryCta.view)
  })

  it('has every stat tile read a metric the dashboard computes', () => {
    for (const tile of homeContent.stats) {
      expect(['total', 'high', 'medium', 'low']).toContain(tile.metric)
    }
  })

  it('gives every settings row an action the view can dispatch', () => {
    const known = ['theme', 'export', 'demo', 'clear']
    for (const row of settingsContent.rows) expect(known).toContain(row.action)
  })

  it('gives the theme row one option per supported theme', () => {
    const themeRow = settingsContent.rows.find(row => row.action === 'theme')
    expect(themeRow?.options?.map(option => option.value)).toEqual(['light', 'dark'])
  })
})

describe('app config', () => {
  it('names a default view that the sidebar can reach', () => {
    expect(navItems.map(item => item.view)).toContain(config.defaultView)
  })

  it('keeps every storage key namespaced, so it cannot collide on a shared origin', () => {
    for (const key of Object.values(config.storageKeys)) {
      expect(key.startsWith('CALL_SENSE_')).toBe(true)
    }
  })

  it('keeps the storage keys distinct', () => {
    const keys = Object.values(config.storageKeys)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('demo transcripts', () => {
  it('provides at least one scenario, each with at least one line', () => {
    expect(demoData.transcripts.length).toBeGreaterThan(0)
    for (const transcript of demoData.transcripts) {
      expect(transcript.length).toBeGreaterThan(0)
      for (const line of transcript) expect(line.trim()).not.toBe('')
    }
  })

  it('labels every line with a speaker, matching captured transcripts', () => {
    for (const line of demoData.transcripts.flat()) {
      expect(line).toMatch(/^(Caller|Operator): /)
    }
  })
})
