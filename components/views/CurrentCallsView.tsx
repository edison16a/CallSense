'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { currentContent } from '@/lib/content'
import type { CurrentCall } from '@/types/call'

interface CurrentCallsViewProps {
  calls: readonly CurrentCall[]
  searchTerm: string
  onSearchChange: (term: string) => void
  /** Keyed by call id. True means the transcript is expanded; missing means collapsed. */
  transcriptVisible: Record<string, boolean>
  onToggleTranscript: (id: string) => void
  onOpenDetail: (id: string) => void
}

/**
 * Call history with inline, expandable transcripts.
 *
 * `calls` arrives already filtered by the search term; this component only
 * owns the input. Keeping the filtering in the state hook means the search
 * result is memoised once instead of recomputed by every render of this tree.
 */
export function CurrentCallsView({
  calls,
  searchTerm,
  onSearchChange,
  transcriptVisible,
  onToggleTranscript,
  onOpenDetail,
}: CurrentCallsViewProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{currentContent.heading}</h2>
        <div className="panel-actions">
          <div className="search-bar">
            <span className="search-icon">{currentContent.searchIcon}</span>
            <input
              type="text"
              placeholder={currentContent.searchPlaceholder}
              value={searchTerm}
              onChange={event => onSearchChange(event.target.value)}
            />
          </div>
        </div>
      </div>
      <ul className="call-list">
        {calls.map(({ id, transcript }) => (
          <li key={id} className="call-item">
            <div className="call-summary">
              <span className="call-from">{id}</span>
              <div className="row-actions">
                <button className="ghost-btn" onClick={() => onOpenDetail(id)}>
                  {currentContent.quickViewLabel}
                </button>
                <button className="toggle-btn" onClick={() => onToggleTranscript(id)}>
                  {transcriptVisible[id]
                    ? currentContent.hideTranscriptLabel
                    : currentContent.showTranscriptLabel}
                </button>
              </div>
            </div>
            <AnimatePresence>
              {transcriptVisible[id] && (
                <motion.div
                  className="transcript"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  {transcript.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </section>
  )
}
