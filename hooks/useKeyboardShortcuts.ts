'use client'

import { useEffect, useRef } from 'react'
import { shortcutToView, toggleListeningShortcut } from '@/lib/navigation'
import type { ViewName } from '@/types/view'

interface UseKeyboardShortcutsOptions {
  onSelectView: (view: ViewName) => void
  onToggleListening: () => void
}

/**
 * Global single-key shortcuts for switching view and toggling the microphone.
 *
 * The mapping from key to view comes from data/navigation.json, so a new screen
 * gets its shortcut from the same entry that gives it a sidebar button. The
 * previous implementation was an if-chain that had to be edited in step with
 * the sidebar markup.
 *
 * Handlers are held in a ref so the listener is attached exactly once. The
 * original achieved the same thing with an empty dependency array, which
 * worked only because both callbacks happened to be
 * identity-independent - a fragile property that a future edit would break
 * silently. The ref makes it hold by construction.
 */
export function useKeyboardShortcuts({
  onSelectView,
  onToggleListening,
}: UseKeyboardShortcutsOptions) {
  const handlers = useRef({ onSelectView, onToggleListening })
  handlers.current = { onSelectView, onToggleListening }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Never hijack a keystroke meant for the search box.
      const target = event.target as HTMLElement | null
      if (target && target.tagName === 'INPUT') return

      const key = event.key.toLowerCase()
      const view = shortcutToView.get(key)
      if (view) handlers.current.onSelectView(view)
      if (key === toggleListeningShortcut) handlers.current.onToggleListening()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
