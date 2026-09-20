'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { dispatchProgressPercent } from '@/lib/dispatch'
import { priorityContent } from '@/lib/content'
import { priorityFilters } from '@/lib/classification'
import type { PriorityCall, PriorityFilter } from '@/types/call'

interface PriorityViewProps {
  calls: readonly PriorityCall[]
  filter: PriorityFilter
  onFilterChange: (filter: PriorityFilter) => void
  /** Call id -> timestamp units were dispatched. Absent means not yet dispatched. */
  dispatched: Record<string, number>
  onSendUnits: (id: string) => void
  onOpenDetail: (id: string) => void
}

/**
 * The dispatch queue.
 *
 * Progress is derived during render from `Date.now()` rather than stored in
 * state, which is why the dashboard runs a one-second ticker: without a
 * periodic re-render these bars would sit still. See useTicker.
 */
export function PriorityView({
  calls,
  filter,
  onFilterChange,
  dispatched,
  onSendUnits,
  onOpenDetail,
}: PriorityViewProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{priorityContent.heading}</h2>
        <div className="panel-actions">
          {priorityFilters.map(level => (
            <button
              key={level}
              className={`action-btn pill ${filter === level ? 'active' : ''}`}
              onClick={() => onFilterChange(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="call-summary panel-header muted" style={{ fontWeight: 600 }}>
        {priorityContent.columns.map((column, index) => (
          <span key={column} className={index === 0 ? 'call-from' : undefined}>
            {column}
          </span>
        ))}
      </div>

      <ul className="call-list">
        <AnimatePresence>
          {calls.map(({ id, level, waitTime }) => {
            const dispatchedAt = dispatched[id]
            const percent = dispatchedAt ? dispatchProgressPercent(waitTime, dispatchedAt) : 0

            return (
              <motion.li
                key={id}
                className="call-summary row"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
              >
                <button
                  className="linkish call-from"
                  onClick={() => onOpenDetail(id)}
                  title={priorityContent.detailsTitle}
                >
                  {id}
                </button>
                <span className={`priority-badge ${level.toLowerCase()}`}>{level}</span>
                <span className="text-sm mx-2">{waitTime}</span>

                {dispatchedAt ? (
                  percent >= 100 ? (
                    <span className="finished">{priorityContent.finishedLabel}</span>
                  ) : (
                    <div className="progress-wrap" title={`${percent.toFixed(0)}%`}>
                      <div className="progress-bar" style={{ width: `${percent}%` }} />
                      <span className="progress-emoji" style={{ left: `${percent}%` }}>
                        {priorityContent.progressIcon}
                      </span>
                    </div>
                  )
                ) : (
                  <div className="row-actions">
                    <button className="toggle-btn" onClick={() => onSendUnits(id)}>
                      {priorityContent.sendUnitsLabel}
                    </button>
                    <button className="ghost-btn" onClick={() => onOpenDetail(id)}>
                      {priorityContent.detailsLabel}
                    </button>
                  </div>
                )}
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </section>
  )
}
