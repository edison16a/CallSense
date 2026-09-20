'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Toast } from '@/hooks/useToast'

interface ToastStackProps {
  toasts: readonly Toast[]
}

/**
 * Renders the transient notification stack.
 *
 * WHAT WAS WRONG BEFORE: useToast returned this markup as a component defined
 * inside the hook body, so it got a fresh function identity on every render.
 * React compares element types by reference, so a new identity means unmount
 * and remount - and with a one-second ticker driving the dashboard, the whole
 * stack was being torn down and rebuilt once a second. Enter animations
 * replayed endlessly, exit animations never played, and AnimatePresence had no
 * stable tree to track.
 *
 * Defining it at module scope gives it one stable identity for the life of the
 * app, which is what AnimatePresence needs to animate anything at all.
 */
export function ToastStack({ toasts }: ToastStackProps) {
  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="toast"
          >
            {toast.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
