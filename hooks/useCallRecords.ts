'use client'

import { useEffect, useMemo, useState } from 'react'
import { ALL_FILTER } from '@/lib/classification'
import { config } from '@/lib/config'
import { computeCallStats } from '@/lib/stats'
import { readRaw, writeJson, writeRaw } from '@/lib/storage'
import type { CallStats, CurrentCall, PriorityCall, PriorityFilter } from '@/types/call'
import { isViewName } from '@/types/view'
import type { ViewName } from '@/types/view'

/**
 * Everything the dashboard remembers between sessions: the dispatch queue, the
 * call history, and which screen was open.
 *
 * These three are one hook rather than three because they share a single
 * hydration step. Reading them separately would mean three independent guards
 * and the possibility of restoring the queue but not the transcripts, leaving
 * two views that disagree about what happened.
 *
 * The filtering and counting live here too, next to the lists they read, so a
 * caller gets the derived values already memoised instead of recomputing them
 * on every render of every screen.
 */
export function useCallRecords() {
  const [view, setView] = useState<ViewName>(config.defaultView)
  const [priorityList, setPriorityList] = useState<PriorityCall[]>([])
  const [currentCalls, setCurrentCalls] = useState<CurrentCall[]>([])
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(ALL_FILTER)
  const [searchTerm, setSearchTerm] = useState('')

  // Declared before the persist effects on purpose. Effects fire in
  // declaration order, so a persist running first would write the empty
  // initial state over whatever was stored.
  // All three reads share one guard. See lib/storage.ts for why.
  useEffect(() => {
    try {
      const storedPriority = readRaw(config.storageKeys.priority)
      const storedCurrent = readRaw(config.storageKeys.current)
      const storedView = readRaw(config.storageKeys.view)
      if (storedPriority) setPriorityList(JSON.parse(storedPriority))
      if (storedCurrent) setCurrentCalls(JSON.parse(storedCurrent))
      // Checked, not cast. A stored name that no longer exists used to be
      // restored as-is and then looked up against the screen table, which
      // returned nothing: a blank content area, no active sidebar item, and
      // the bad value written straight back to storage on the next render.
      if (isViewName(storedView)) setView(storedView)
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

  /**
   * Files a finished call into the history and the queue.
   *
   * Both lists are capped at config.limits.maxStoredCalls. The cap exists
   * because everything here goes into localStorage, which has a few megabytes
   * to work with and no eviction of its own.
   */
  const recordCall = (call: CurrentCall, queueEntry: PriorityCall) => {
    const cap = config.limits.maxStoredCalls - 1
    setCurrentCalls(previous => [call, ...previous.slice(0, cap)])
    setPriorityList(previous => [queueEntry, ...previous.slice(0, cap)])
  }

  /** Empties both lists. The persist effects write the empty state straight through. */
  const clearRecords = () => {
    setPriorityList([])
    setCurrentCalls([])
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

  const stats: CallStats = useMemo(() => computeCallStats(priorityList), [priorityList])

  return {
    view,
    setView,
    priorityList,
    currentCalls,
    recordCall,
    clearRecords,
    priorityFilter,
    setPriorityFilter,
    filteredPriority,
    searchTerm,
    setSearchTerm,
    filteredCurrent,
    stats,
  }
}
