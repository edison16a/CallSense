'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { modalContent } from '@/lib/content'
import type { CurrentCall } from '@/types/call'

interface CallDetailModalProps {
  /** Id of the call being inspected, or null when the dialog is closed. */
  callId: string | null
  /** The matching call, or null if it is no longer in the history. */
  call: CurrentCall | null
  onClose: () => void
}

/**
 * Read-only transcript viewer.
 *
 * `callId` and `call` are passed separately because they can disagree: the
 * dialog stays open on an id whose call has since been cleared, and that case
 * shows the empty message rather than closing itself out from under the user.
 */
export function CallDetailModal({ callId, call, onClose }: CallDetailModalProps) {
  return (
    <Modal
      open={!!callId}
      title={callId ? `${modalContent.titlePrefix}${callId}` : modalContent.defaultTitle}
      onClose={onClose}
    >
      {!call ? (
        <div>{modalContent.emptyMessage}</div>
      ) : (
        <div className="detail-scroll">
          {call.transcript.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}
    </Modal>
  )
}
