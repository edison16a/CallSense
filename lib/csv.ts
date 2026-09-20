import { config } from '@/lib/config'
import type { PriorityCall } from '@/types/call'

/**
 * Renders rows as RFC 4180-ish CSV.
 *
 * Every field is quoted unconditionally and embedded quotes are doubled, so
 * call ids or levels containing commas cannot break the column layout. Rows
 * are joined with LF; Excel accepts this and it keeps the output diffable.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

/** Turns the priority queue into CSV rows, header first. Column order comes from data/app-config.json. */
export function priorityQueueToCsv(calls: readonly PriorityCall[]): string {
  return toCsv([
    config.csv.headers,
    ...calls.map(call => [call.id, call.level, call.waitTime]),
  ])
}

/**
 * Triggers a browser download of `contents`.
 *
 * Uses the synthetic-anchor trick rather than a data: URL because data: URLs
 * are size-limited and ignore the download filename in some browsers. The
 * object URL is revoked immediately after the click to avoid leaking the blob
 * for the lifetime of the document.
 */
export function downloadTextFile(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Filename for an export, stamped so repeated exports do not overwrite each other. */
export function csvFilename(): string {
  return `${config.csv.filenamePrefix}${Date.now()}.csv`
}
