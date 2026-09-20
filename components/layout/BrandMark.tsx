import React from 'react'
import { headerContent } from '@/lib/content'

interface BrandMarkProps {
  /** Renders the compact variant used in the sidebar. */
  small?: boolean
}

/**
 * The pulsing "CS" badge.
 *
 * Extracted because it appeared twice with identical markup and only a size
 * modifier between them - the kind of duplication where one copy quietly
 * drifts from the other.
 */
export function BrandMark({ small = false }: BrandMarkProps) {
  return (
    <div className={`cs-logo${small ? ' small' : ''}`}>
      <span className="cs-ring" />
      <span className="cs-initials">{headerContent.initials}</span>
    </div>
  )
}
