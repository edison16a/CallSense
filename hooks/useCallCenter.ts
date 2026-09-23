'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  askComfortingQuestions,
  askFurtherQuestions,
  askImportantDetails,
  classifyTranscript,
} from '@/lib/gemini/analysis'
import { ALL_FILTER, UNKNOWN_LEVEL, levelFromTranscriptKeywords } from '@/lib/classification'
import { config } from '@/lib/config'
import { csvFilename, downloadTextFile, priorityQueueToCsv } from '@/lib/csv'
import { createCallId, nowStamp, randomWaitTime } from '@/lib/format'
import { classificationMessages, formatMessage, toastMessages, transcriptMessages } from '@/lib/messages'
import { readRaw, writeJson, writeRaw } from '@/lib/storage'
import demoData from '@/data/demo-transcripts.json'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useNotificationSounds } from '@/hooks/useNotificationSounds'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTheme } from '@/hooks/useTheme'
import { useTicker } from '@/hooks/useTicker'
import { useToast } from '@/hooks/useToast'
import type { CallStats, CurrentCall, PriorityCall, PriorityFilter, PriorityLevel } from '@/types/call'
import type { ViewName } from '@/types/view'

/**
 * The dashboard's whole state machine, assembled from the single-purpose hooks.
 *
 * It exists so that app/page.tsx can be pure composition: every screen reads
 * what it needs off one object instead of the page threading two dozen props.
 * Splitting it further would mean either prop-drilling through the view
 * components or introducing a context, and neither buys anything while the
 * state is this interconnected - ending a call touches the transcript, the
 * queue, the history, the classification banner and the toast stack at once.
 */
export function useCallCenter() {
  const { push, toasts } = useToast()
  const { theme, setTheme, toggleTheme } = useTheme()
  const { liveTranscripts, setLiveTranscripts, listening, toggleListening, stopListening } =
    useSpeechRecognition({ push })
  const { playSend, playDone } = useNotificationSounds()

  // Drives the dispatch progress bars; the value itself is never rendered.
  useTicker()

  const [view, setView] = useState<ViewName>(config.defaultView)
  const [priorityList, setPriorityList] = useState<PriorityCall[]>([])
  const [currentCalls, setCurrentCalls] = useState<CurrentCall[]>([])

  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(ALL_FILTER)
  const [detailModalId, setDetailModalId] = useState<string | null>(null)

  const [comfortingQuestions, setComfortingQuestions] = useState<string[]>([])
  const [furtherQuestions, setFurtherQuestions] = useState<string[]>([])
  const [importantDetails, setImportantDetails] = useState<Record<number, string[]>>({})
  const [classification, setClassification] = useState('')
  const [loading, setLoading] = useState(false)

  /** Keyed by call id, holding the moment units were dispatched. Used to compute progress. */
  const [dispatched, setDispatched] = useState<Record<string, number>>({})

  useKeyboardShortcuts({ onSelectView: setView, onToggleListening: toggleListening })

  // Hydrate before any persist effect below, which is why this is declared
  // first: effects run in declaration order, and a persist effect firing first
  // would write the empty initial state over the stored data.
  // All three reads share one guard on purpose - see lib/storage.ts.
  useEffect(() => {
    try {
      const storedPriority = readRaw(config.storageKeys.priority)
      const storedCurrent = readRaw(config.storageKeys.current)
      const storedView = readRaw(config.storageKeys.view) as ViewName | null
      if (storedPriority) setPriorityList(JSON.parse(storedPriority))
      if (storedCurrent) setCurrentCalls(JSON.parse(storedCurrent))
      if (storedView) setView(storedView)
    } catch {
      // Corrupt or unavailable storage: start from a clean dashboard.
    }
  }, [])

  useEffect(() => {
    writeJson(config.storageKeys.priority, priorityList)
  }, [priorityList])

  useEffect(() => {
    writeJson(config.storageKeys.current, currentCalls)
  }, [currentCalls])

  useEffect(() => {
    writeRaw(config.storageKeys.view, view)
  }, [view])

  /** Marks a call as dispatched, which swaps its row actions for a progress bar. */
  const sendUnits = (id: string) => {
    setDispatched(previous => ({ ...previous, [id]: Date.now() }))
    playSend()
    push(formatMessage(toastMessages.unitsDispatched, { id }))
  }

  const toggleTranscript = (id: string) =>
    setTranscriptVisible(previous => ({ ...previous, [id]: !previous[id] }))

  const handleHighlight = () => {
    push(toastMessages.highlighted)
  }

  const handleMarkDangerous = () => {
    setClassification(classificationMessages.manualDanger)
    push(toastMessages.markedDangerous)
  }

  const handleFurtherQuestions = async () => {
    setFurtherQuestions(await askFurtherQuestions(liveTranscripts.join('\n')))
  }

  /**
   * Ends dictation, classifies what was captured, and files the call into both
   * the queue and the history.
   *
   * The deliberate pause before analysis is cosmetic: it keeps the skeleton
   * loader on screen long enough to read. It runs before the network calls, so
   * it adds to rather than masks the real latency.
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
    const newCall: CurrentCall = {
      id,
      transcript: [
        ...liveTranscripts,
        formatMessage(transcriptMessages.dangerLevelLine, { level: resolvedLevel }),
        formatMessage(transcriptMessages.timestampLine, { timestamp: nowStamp() }),
      ],
    }
    setCurrentCalls(previous => [newCall, ...previous.slice(0, config.limits.maxStoredCalls - 1)])
    setPriorityList(previous => [
      { id, level: resolvedLevel, waitTime: randomWaitTime() },
      ...previous.slice(0, config.limits.maxStoredCalls - 1),
    ])

    setClassification(formatMessage(classificationMessages.dangerLevel, { level: resolvedLevel }))
    setComfortingQuestions(await askComfortingQuestions(text))
    setImportantDetails({ 0: await askImportantDetails(text) })

    setLiveTranscripts([])
    setLoading(false)
    playDone()
    push(formatMessage(toastMessages.callAnalyzed, { id, level: resolvedLevel }))

    // Off by default: the dispatcher stays on Live Call rather than being
    // thrown to the queue mid-thought. Flag lives in data/app-config.json.
    if (config.features.redirectToPriorityOnEndCall) setView('priority')
  }

  const exportCsv = () => {
    downloadTextFile(csvFilename(), priorityQueueToCsv(priorityList), config.csv.mimeType)
    push(toastMessages.exportedCsv)
  }

  /** Appends a random canned transcript and jumps to Live Call to show it. */
  const simulateCall = () => {
    const sample = demoData.transcripts[Math.floor(Math.random() * demoData.transcripts.length)]
    setLiveTranscripts(previous => [...previous, ...sample])
    push(toastMessages.demoAppended)
    setView('live')
  }

  /** Wipes the queue, the history and dispatch progress. Transcripts in flight survive. */
  const clearData = () => {
    setPriorityList([])
    setCurrentCalls([])
    setDispatched({})
    push(toastMessages.dataCleared)
  }

  const filteredPriority = useMemo(
    () =>
      priorityFilter === ALL_FILTER
        ? priorityList
        : priorityList.filter(call => call.level === priorityFilter),
    [priorityList, priorityFilter]
  )

  /** Matches the search term against the call id or any transcript line. */
  const filteredCurrent = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return currentCalls.filter(
      call =>
        call.id.toLowerCase().includes(term) ||
        call.transcript.some(line => line.toLowerCase().includes(term))
    )
  }, [currentCalls, searchTerm])

  const detailCall = useMemo(
    () => (detailModalId ? currentCalls.find(call => call.id === detailModalId) ?? null : null),
    [detailModalId, currentCalls]
  )

  const stats: CallStats = useMemo(
    () => ({
      total: priorityList.length,
      high: priorityList.filter(call => call.level === 'High').length,
      medium: priorityList.filter(call => call.level === 'Medium').length,
      low: priorityList.filter(call => call.level === 'Low').length,
    }),
    [priorityList]
  )

  return {
    toasts,
    view,
    setView,
    theme,
    setTheme,
    toggleTheme,
    liveTranscripts,
    listening,
    toggleListening,
    loading,
    classification,
    comfortingQuestions,
    furtherQuestions,
    importantDetails,
    priorityFilter,
    setPriorityFilter,
    filteredPriority,
    filteredCurrent,
    searchTerm,
    setSearchTerm,
    transcriptVisible,
    toggleTranscript,
    dispatched,
    sendUnits,
    detailModalId,
    setDetailModalId,
    detailCall,
    stats,
    handleHighlight,
    handleMarkDangerous,
    handleFurtherQuestions,
    handleEndCall,
    exportCsv,
    simulateCall,
    clearData,
  }
}
