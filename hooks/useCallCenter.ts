'use client'

import { useMemo, useState } from 'react'
import { config } from '@/lib/config'
import { csvFilename, downloadTextFile, priorityQueueToCsv } from '@/lib/csv'
import { formatMessage, toastMessages } from '@/lib/messages'
import demoData from '@/data/demo-transcripts.json'
import { useCallAnalysis } from '@/hooks/useCallAnalysis'
import { useCallRecords } from '@/hooks/useCallRecords'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useNotificationSounds } from '@/hooks/useNotificationSounds'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTheme } from '@/hooks/useTheme'
import { useTicker } from '@/hooks/useTicker'
import { useToast } from '@/hooks/useToast'

/**
 * The dashboard's state, assembled from the single-purpose hooks.
 *
 * It exists so app/page.tsx can be pure composition: every screen reads what
 * it needs off one object instead of the page threading two dozen props.
 *
 * What is left here after the records and the analysis moved out is the glue
 * that genuinely spans them: dispatching units, exporting, clearing, and the
 * small pieces of view state that are not worth persisting.
 */
export function useCallCenter() {
  const { push, toasts } = useToast()
  const { theme, setTheme, toggleTheme } = useTheme()
  const { liveTranscripts, setLiveTranscripts, listening, toggleListening, stopListening } =
    useSpeechRecognition({ push })
  const { playSend, playDone } = useNotificationSounds()

  // Drives the dispatch progress bars. The value itself is never rendered.
  useTicker()

  const records = useCallRecords()

  const analysis = useCallAnalysis({
    liveTranscripts,
    setLiveTranscripts,
    stopListening,
    push,
    playDone,
    recordCall: records.recordCall,
    onAnalysisComplete: () => records.setView('priority'),
  })

  /** Which transcripts are expanded in the history. Not worth persisting. */
  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({})
  const [detailModalId, setDetailModalId] = useState<string | null>(null)

  /** Keyed by call id, holding the moment units were dispatched. Used for progress. */
  const [dispatched, setDispatched] = useState<Record<string, number>>({})

  useKeyboardShortcuts({ onSelectView: records.setView, onToggleListening: toggleListening })

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

  const exportCsv = () => {
    downloadTextFile(
      csvFilename(),
      priorityQueueToCsv(records.priorityList),
      config.csv.mimeType
    )
    push(toastMessages.exportedCsv)
  }

  /** Appends a random canned transcript and jumps to Live Call to show it. */
  const simulateCall = () => {
    const sample = demoData.transcripts[Math.floor(Math.random() * demoData.transcripts.length)]
    setLiveTranscripts(previous => [...previous, ...sample])
    push(toastMessages.demoAppended)
    records.setView('live')
  }

  /** Wipes the queue, the history and dispatch progress. Transcripts in flight survive. */
  const clearData = () => {
    records.clearRecords()
    setDispatched({})
    push(toastMessages.dataCleared)
  }

  /**
   * The call the detail dialog is showing.
   *
   * Resolves to null when the dialog is open on an id that has since been
   * cleared, which the dialog renders as an empty state rather than closing
   * itself out from under the user.
   */
  const detailCall = useMemo(
    () =>
      detailModalId
        ? records.currentCalls.find(call => call.id === detailModalId) ?? null
        : null,
    [detailModalId, records.currentCalls]
  )

  return {
    toasts,
    view: records.view,
    setView: records.setView,
    theme,
    setTheme,
    toggleTheme,
    liveTranscripts,
    listening,
    toggleListening,
    loading: analysis.loading,
    classification: analysis.classification,
    comfortingQuestions: analysis.comfortingQuestions,
    furtherQuestions: analysis.furtherQuestions,
    importantDetails: analysis.importantDetails,
    priorityFilter: records.priorityFilter,
    setPriorityFilter: records.setPriorityFilter,
    filteredPriority: records.filteredPriority,
    filteredCurrent: records.filteredCurrent,
    searchTerm: records.searchTerm,
    setSearchTerm: records.setSearchTerm,
    transcriptVisible,
    toggleTranscript,
    dispatched,
    sendUnits,
    detailModalId,
    setDetailModalId,
    detailCall,
    stats: records.stats,
    handleHighlight,
    handleMarkDangerous: analysis.handleMarkDangerous,
    handleFurtherQuestions: analysis.handleFurtherQuestions,
    handleEndCall: analysis.handleEndCall,
    exportCsv,
    simulateCall,
    clearData,
  }
}
