'use client'

import React from 'react'
import { BrandMark } from '@/components/layout/BrandMark'
import { sidebarContent } from '@/lib/content'
import { navItems, shortcutHint } from '@/lib/navigation'
import type { ViewName } from '@/types/view'

interface SidebarProps {
  view: ViewName
  onSelectView: (view: ViewName) => void
  onClearData: () => void
}

/**
 * Primary navigation, rendered from data/navigation.json.
 *
 * Both the buttons and the shortcut hint line derive from the same array, so a
 * new screen cannot end up with a button but no shortcut (or vice versa) the
 * way it could when these were three hard-coded lists.
 */
export function Sidebar({ view, onSelectView, onClearData }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <BrandMark small />
          <span className="sidebar-title">{sidebarContent.title}</span>
        </div>
        <div className="kbd-hint">{shortcutHint}</div>
      </div>

      {navItems.map(item => (
        <div
          key={item.view}
          className={`nav-item ${view === item.view ? 'active' : ''}`}
          onClick={() => onSelectView(item.view)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}

      <div className="sidebar-bottom">
        <button className="danger-btn" onClick={onClearData}>
          {sidebarContent.clearDataLabel}
        </button>
      </div>
    </aside>
  )
}
