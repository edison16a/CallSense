'use client'

import React from 'react'
import { BrandMark } from '@/components/layout/BrandMark'
import { headerContent } from '@/lib/content'
import type { ThemeName } from '@/lib/theme'

interface AppHeaderProps {
  theme: ThemeName
  onToggleTheme: () => void
  onSimulateCall: () => void
  onExportCsv: () => void
}

/** Sticky top bar: branding plus the three global actions. */
export function AppHeader({ theme, onToggleTheme, onSimulateCall, onExportCsv }: AppHeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <BrandMark />
        <div className="brand-text">
          <h1>{headerContent.title}</h1>
          <p className="tag">{headerContent.tagline}</p>
        </div>
      </div>
      <div className="header-actions">
        <button className="chip" onClick={onToggleTheme} title={headerContent.themeToggleTitle}>
          {/* Labels name the theme being switched TO, not the current one. */}
          {theme === 'light' ? headerContent.themeToggleToDark : headerContent.themeToggleToLight}
        </button>
        <button className="chip" onClick={onSimulateCall} title={headerContent.demoTitle}>
          {headerContent.demoLabel}
        </button>
        <button className="chip" onClick={onExportCsv} title={headerContent.exportTitle}>
          {headerContent.exportLabel}
        </button>
        <div className="user-menu">
          {/* Plain <img>: the avatar is a remote SVG from a third-party
              generator, which next/image cannot optimise without allow-listing
              the host, and it gains nothing at 40px. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="user-avatar" src={headerContent.avatarSrc} alt={headerContent.avatarAlt} />
        </div>
      </div>
    </header>
  )
}
