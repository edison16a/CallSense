'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { modalContent } from '@/lib/content'

interface ModalProps {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
}

/**
 * Centred dialog with a click-away backdrop.
 *
 * KNOWN LIMITATION, preserved: the early return happens outside
 * AnimatePresence, so the whole tree unmounts the instant `open` goes false
 * and the exit animation never plays. Hoisting AnimatePresence above the
 * guard would fix it, but it visibly changes how the dialog dismisses, so it
 * is left alone and flagged instead.
 */
export function Modal({ open, title, children, onClose }: ModalProps) {
  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          // Stop the backdrop's click-away handler firing for clicks inside
          // the dialog itself.
          onClick={event => event.stopPropagation()}
        >
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose}>
              {modalContent.closeLabel}
            </button>
          </div>
          <div className="modal-body">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
