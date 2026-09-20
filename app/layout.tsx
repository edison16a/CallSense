import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { renderThemeCss } from '@/lib/theme'
import content from '@/data/content.json'

export const metadata: Metadata = {
  title: content.metadata.title,
  description: content.metadata.description,
}

/**
 * Root layout.
 *
 * The design tokens are injected here as a <style> element rather than being
 * written into a stylesheet, because they are data now (data/theme.json).
 * This is a server component, so the rule lands in the server-rendered HTML -
 * there is no flash of untokenised layout the way there would be if a client
 * effect wrote the properties after hydration.
 *
 * dangerouslySetInnerHTML is safe here: the content is generated from a
 * checked-in JSON file at build time, never from user input.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: renderThemeCss() }} />
      </head>
      <body>
        <main className="content-wrapper">{children}</main>
      </body>
    </html>
  )
}
