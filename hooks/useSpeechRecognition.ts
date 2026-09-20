'use client'

import { useEffect, useRef, useState } from 'react'
import { config } from '@/lib/config'
import { formatMessage, toastMessages, transcriptMessages } from '@/lib/messages'
import type { PushToast } from '@/hooks/useToast'
import type {
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionResult,
  SpeechRecognitionWindow,
} from '@/types/speech'

interface UseSpeechRecognitionOptions {
  /** Raises the toast shown when the microphone errors out. */
  push: PushToast
}

/**
 * Live dictation into a growing list of transcript lines.
 *
 * The recogniser is created once and kept in a ref, not in state: it is a
 * mutable browser object with its own lifecycle, and re-creating it on every
 * render would drop the in-flight audio session. `listening` is the piece of
 * it that React needs to see, and a second effect mirrors that boolean onto
 * the recogniser.
 *
 * When the API is unavailable (Firefox, older browsers) the ref stays null and
 * every operation becomes a no-op - the rest of the dashboard still works,
 * just without dictation.
 */
export function useSpeechRecognition({ push }: UseSpeechRecognitionOptions) {
  const [liveTranscripts, setLiveTranscripts] = useState<string[]>([])
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || recognitionRef.current) return

    const speechWindow = window as unknown as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) return

    const recognition = new Recognition()
    recognition.continuous = config.speechRecognition.continuous
    recognition.interimResults = config.speechRecognition.interimResults
    recognition.lang = config.speechRecognition.lang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Slice from resultIndex: the list is cumulative for the session, so
      // reading it whole would re-append every phrase already transcribed.
      const transcript = Array.from(event.results as ArrayLike<SpeechRecognitionResult>)
        .slice(event.resultIndex)
        .map(result => result[0].transcript)
        .join('')
      setLiveTranscripts(previous => [
        ...previous,
        formatMessage(transcriptMessages.callerLine, { text: transcript }),
      ])
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event)
      setListening(false)
      push(toastMessages.micError)
    }

    // The browser ends the session on its own after silence; mirror that back
    // into state so the button does not keep claiming it is listening.
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
  }, [push])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition) return
    if (listening) recognition.start()
    else recognition.stop()
  }, [listening])

  const toggleListening = () => setListening(current => !current)

  /** Stops dictation without waiting for the recogniser's own `onend`. */
  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return { liveTranscripts, setLiveTranscripts, listening, toggleListening, stopListening }
}
