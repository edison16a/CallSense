'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { liveContent } from '@/lib/content'
import { config } from '@/lib/config'
import { flattenImportantDetails, isQuestionsHeadingIndex } from '@/lib/details'

interface LiveCallViewProps {
  liveTranscripts: readonly string[]
  listening: boolean
  onToggleListening: () => void
  onHighlight: () => void
  onMarkDangerous: () => void
  onGenerateQuestions: () => void
  onEndCall: () => void
  /** True while end-of-call analysis runs; swaps the results area for a skeleton. */
  loading: boolean
  classification: string
  comfortingQuestions: readonly string[]
  furtherQuestions: readonly string[]
  importantDetails: Record<number, string[]>
}

/**
 * The dispatcher's working screen: live dictation plus everything the model
 * returned about the call.
 *
 * The comforting-questions panel is gated on a feature flag that ships off.
 * It was a literal `false &&` in the original; naming the flag keeps the
 * author's intent (kept, not deleted) legible and moves the decision into
 * data/app-config.json.
 */
export function LiveCallView({
  liveTranscripts,
  listening,
  onToggleListening,
  onHighlight,
  onMarkDangerous,
  onGenerateQuestions,
  onEndCall,
  loading,
  classification,
  comfortingQuestions,
  furtherQuestions,
  importantDetails,
}: LiveCallViewProps) {
  const detailLines = flattenImportantDetails(importantDetails)

  return (
    <section className="current-call-panel">
      <div
        className="current-call-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h2>{liveContent.heading}</h2>
        <div className="live-actions" style={{ display: 'flex', gap: '10px' }}>
          <button
            className={`toggle-btn mic ${listening ? 'on' : ''}`}
            onClick={onToggleListening}
            title={liveContent.micTitle}
          >
            {listening ? liveContent.micStopLabel : liveContent.micStartLabel}
          </button>
          <button className="toggle-btn" onClick={onHighlight}>
            {liveContent.highlightLabel}
          </button>
          <button className="toggle-btn warn" onClick={onMarkDangerous}>
            {liveContent.markDangerousLabel}
          </button>
          <button className="toggle-btn" onClick={onGenerateQuestions}>
            {liveContent.generateQuestionsLabel}
          </button>
          <button className="toggle-btn success" onClick={onEndCall}>
            {liveContent.endCallLabel}
          </button>
        </div>
      </div>

      <div className="live-transcript">
        <AnimatePresence>
          {liveTranscripts.map((line, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              {line}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {loading ? (
        <div className="loading-panel">
          <div className="skeleton-row" />
          <div className="skeleton-row" />
          <div className="skeleton-row short" />
        </div>
      ) : (
        <>
          <AnimatePresence>
            {classification && (
              <motion.div
                key="classification"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="classification"
              >
                {classification}
              </motion.div>
            )}
          </AnimatePresence>

          {config.features.showComfortingQuestions && comfortingQuestions.length > 0 && (
            <div className="comforting-questions panel-section">
              <h3>{liveContent.comfortingHeading}</h3>
              {comfortingQuestions.map((question, index) => (
                <p key={index} className="comforting-question">
                  {question}
                </p>
              ))}
            </div>
          )}

          <section className="important-details-panel panel-section">
            <h3>{liveContent.detailsHeading}</h3>
            <ul className="important-details">
              {detailLines.map((line, index) => (
                <React.Fragment key={index}>
                  {isQuestionsHeadingIndex(index) && <h3>{liveContent.detailsQuestionsHeading}</h3>}
                  <li className="important-detail">{line}</li>
                </React.Fragment>
              ))}
            </ul>
          </section>

          {furtherQuestions.length > 0 && (
            <div className="further-questions panel-section">
              <h3>{liveContent.furtherHeading}</h3>
              {furtherQuestions.map((question, index) => (
                <p key={index} className="further-question">
                  {question}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
