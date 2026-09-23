'use client'

import { useState } from 'react'
import {
  askComfortingQuestions,
  askFurtherQuestions,
  askImportantDetails,
  classifyTranscript,
} from '@/lib/gemini/analysis'
import { UNKNOWN_LEVEL, levelFromTranscriptKeywords } from '@/lib/classification'
import { config } from '@/lib/config'
import { createCallId, nowStamp, randomWaitTime } from '@/lib/format'
import {
  classificationMessages,
  formatMessage,
  toastMessages,
  transcriptMessages,
} from '@/lib/messages'
import type { PushToast } from '@/hooks/useToast'
import type { CurrentCall, PriorityCall, PriorityLevel } from '@/types/call'

interface UseCallAnalysisOptions {
  /** Lines captured so far. Read at the moment End Call is pressed. */
  liveTranscripts: string[]
  /** Clears the transcript once the finished call has been filed. */
  setLiveTranscripts: (lines: string[]) => void
  /** Stops dictation before analysis starts. */
  stopListening: () => void
  push: PushToast
  /** Plays the completion cue. */
  playDone: () => void
  /** Files the finished call into the history and the queue. */
  recordCall: (call: CurrentCall, queueEntry: PriorityCall) => void
  /** Called after filing, only when the redirect feature flag is on. */
  onAnalysisComplete: () => void
}

/**
 * The end-of-call pipeline and everything it produces for the Live Call
 * screen: the danger level banner, the extracted details, and the suggested
 * questions.
 *
 * Second half of breaking up useCallCenter. This is the only part of the
 * dashboard that talks to Gemini, so keeping it separate means the network
 * behaviour has one place to look and the persisted records have another.
 *
 * It takes the transcript and the record-keeping as callbacks rather than
 * owning them, because a call ends by moving data from one of those to the
 * other and neither side should own both.
 */
export function useCallAnalysis({
  liveTranscripts,
  setLiveTranscripts,
  stopListening,
  push,
  playDone,
  recordCall,
  onAnalysisComplete,
}: UseCallAnalysisOptions) {
  const [comfortingQuestions, setComfortingQuestions] = useState<string[]>([])
  const [furtherQuestions, setFurtherQuestions] = useState<string[]>([])
  const [importantDetails, setImportantDetails] = useState<Record<number, string[]>>({})
  const [classification, setClassification] = useState('')
  const [loading, setLoading] = useState(false)

  /** Overrides the banner by hand, for when the dispatcher knows better than the model. */
  const handleMarkDangerous = () => {
    setClassification(classificationMessages.manualDanger)
    push(toastMessages.markedDangerous)
  }

  /** Asks for follow-up questions mid-call, without ending it. */
  const handleFurtherQuestions = async () => {
    setFurtherQuestions(await askFurtherQuestions(liveTranscripts.join('\n')))
  }

  /**
   * Ends dictation, classifies what was captured, and files the call into both
   * the queue and the history.
   *
   * The pause before analysis is cosmetic: it keeps the skeleton loader on
   * screen long enough to read. It runs before the network calls, so it adds to
   * the real latency rather than hiding it.
   */
  const handleEndCall = async () => {
    stopListening()

    setLoading(true)
    setClassification('')
    setComfortingQuestions([])
    setImportantDetails({})
    setFurtherQuestions([])

    await new Promise(resolve => setTimeout(resolve, config.timings.analysisDelayMs))

    const text = liveTranscripts.join('\n') || transcriptMessages.emptyTranscript
    const level = await classifyTranscript(text)
    // Unknown means the model gave us nothing usable, so fall back to keywords
    // rather than filing the call at an arbitrary level.
    const resolvedLevel: PriorityLevel =
      level === UNKNOWN_LEVEL ? levelFromTranscriptKeywords(text) : level

    const id = createCallId()
    recordCall(
      {
        id,
        transcript: [
          ...liveTranscripts,
          formatMessage(transcriptMessages.dangerLevelLine, { level: resolvedLevel }),
          formatMessage(transcriptMessages.timestampLine, { timestamp: nowStamp() }),
        ],
      },
      { id, level: resolvedLevel, waitTime: randomWaitTime() }
    )

    setClassification(formatMessage(classificationMessages.dangerLevel, { level: resolvedLevel }))
    setComfortingQuestions(await askComfortingQuestions(text))
    setImportantDetails({ 0: await askImportantDetails(text) })

    setLiveTranscripts([])
    setLoading(false)
    playDone()
    push(formatMessage(toastMessages.callAnalyzed, { id, level: resolvedLevel }))

    // Off by default: the dispatcher stays on Live Call rather than being
    // thrown to the queue mid-thought. Flag lives in data/app-config.json.
    if (config.features.redirectToPriorityOnEndCall) onAnalysisComplete()
  }

  return {
    loading,
    classification,
    comfortingQuestions,
    furtherQuestions,
    importantDetails,
    handleMarkDangerous,
    handleFurtherQuestions,
    handleEndCall,
  }
}
