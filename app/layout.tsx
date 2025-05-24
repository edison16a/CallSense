
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
        <header className="header">
          <h1>CallSense</h1>
          <div className="user-menu">
            <span className="user-avatar">👤</span>
          </div>
        </header>
        <main className="content-wrapper">
          {children}
        </main>
      </body>
    </html>
  )
}
