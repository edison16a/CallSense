'use client'

import { useEffect, useState } from 'react'
import { config } from '@/lib/config'
import { writeRaw } from '@/lib/storage'
import type { ThemeName } from '@/lib/theme'

/**
 * Light/dark preference, persisted to localStorage and applied by toggling a
 * `dark` class on <html>. The class is what the `.dark` token block keys off.
 *
 * KNOWN LIMITATION, preserved: the initial value is read from localStorage
 * during the first client render, but the server rendered the default theme,
 * so a returning dark-mode user hydrates with a mismatch and a flash of light.
 * Fixing it properly means either an inline pre-hydration script or accepting
 * a deliberate one-frame flash - a product decision, not a refactor.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeName>(
    () =>
      (typeof window !== 'undefined' &&
        (localStorage.getItem(config.storageKeys.theme) as ThemeName | null)) ||
      config.defaultTheme
  )

  useEffect(() => {
    writeRaw(config.storageKeys.theme, theme)
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  /** Flips between the two schemes. Exposed separately because two places trigger it. */
  const toggleTheme = () => setTheme(current => (current === 'light' ? 'dark' : 'light'))

  return { theme, setTheme, toggleTheme }
}
