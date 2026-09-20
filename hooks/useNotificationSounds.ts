'use client'

import { useEffect, useRef } from 'react'
import { config } from '@/lib/config'

/**
 * Audio cues for dispatching units and for finishing analysis.
 *
 * Created in an effect rather than at module scope because `Audio` does not
 * exist during server rendering.
 *
 * KNOWN LIMITATION: the two data URIs in data/app-config.json are truncated
 * placeholders that do not decode to playable audio, so neither cue is
 * audible. They are kept because removing them would delete the only evidence
 * of where sound was meant to go; supplying real audio is a content change,
 * not a refactor.
 *
 * That limitation is also why playback rejections must be swallowed. play()
 * returns a promise, and it rejects both for the undecodable placeholders and
 * - in every browser - when audio is played before the user has interacted
 * with the page. The original ignored the promise entirely, so each dispatch
 * and each completed analysis raised an unhandled rejection in the console.
 */
export function useNotificationSounds() {
  const sendSound = useRef<HTMLAudioElement | null>(null)
  const doneSound = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    sendSound.current = new Audio(config.sounds.send)
    doneSound.current = new Audio(config.sounds.done)
  }, [])

  /** Plays a cue, ignoring the rejection an undecodable or blocked source produces. */
  const play = (audio: HTMLAudioElement | null) => {
    void audio?.play?.()?.catch(() => {
      // Autoplay blocked or source undecodable. A missing sound cue is never
      // worth surfacing during a live call.
    })
  }

  return {
    /** Played when units are dispatched for a call. */
    playSend: () => play(sendSound.current),
    /** Played when end-of-call analysis finishes. */
    playDone: () => play(doneSound.current),
  }
}
