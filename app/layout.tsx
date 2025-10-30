
import React from 'react'
import './globals.css'

export const metadata = {
  title: 'CallSense Dashboard',
  description: 'Police call prioritization & live transcripts'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main className="content-wrapper">
          {children}
        </main>
      </body>
    </html>
  )
}
