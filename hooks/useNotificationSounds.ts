'use client'

import { useEffect, useRef } from 'react'
import { config } from '@/lib/config'

/**
 * Audio cues for dispatching units and for finishing analysis.
 *
 * Created in an effect rather than at module scope because `Audio` does not
 * exist during server rendering.
 *
 * KNOWN LIMITATION, preserved: the two data URIs in data/app-config.json are
 * truncated placeholders that do not decode to playable audio, so neither cue
 * is audible. They are kept because removing them would delete the only
 * evidence of where sound was meant to go; supplying real audio is a content
 * change, not a refactor.
 */
export function useNotificationSounds() {
  const sendSound = useRef<HTMLAudioElement | null>(null)
  const doneSound = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    sendSound.current = new Audio(config.sounds.send)
    doneSound.current = new Audio(config.sounds.done)
  }, [])

  return {
    /** Played when units are dispatched for a call. */
    playSend: () => sendSound.current?.play?.(),
    /** Played when end-of-call analysis finishes. */
    playDone: () => doneSound.current?.play?.(),
  }
}
