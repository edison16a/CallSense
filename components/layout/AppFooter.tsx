import React from 'react'
import { footerContent } from '@/lib/content'

/** Page footer. The year is computed at render so it never goes stale. */
export function AppFooter() {
  return (
    <footer className="footer">
      <div>
        {footerContent.copyrightPrefix} {new Date().getFullYear()} {footerContent.copyrightName}
      </div>
      <div className="footer-right">{footerContent.note}</div>
    </footer>
  )
}
