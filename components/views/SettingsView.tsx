'use client'

import React from 'react'
import { settingsContent } from '@/lib/content'
import type { ThemeName } from '@/lib/theme'

interface SettingsViewProps {
  theme: ThemeName
  onThemeChange: (theme: ThemeName) => void
  onToggleTheme: () => void
  onExportCsv: () => void
  onSimulateCall: () => void
  onClearData: () => void
}

/**
 * Preferences and maintenance actions.
 *
 * Rows come from data/content.json and name their behaviour with an `action`
 * key, which this component maps to a handler. That keeps the labels,
 * descriptions and button styling editable without code while leaving the
 * behaviour itself where it can be type-checked - a row naming an unknown
 * action simply renders nothing rather than silently doing the wrong thing.
 */
export function SettingsView({
  theme,
  onThemeChange,
  onToggleTheme,
  onExportCsv,
  onSimulateCall,
  onClearData,
}: SettingsViewProps) {
  const actionHandlers: Record<string, () => void> = {
    export: onExportCsv,
    demo: onSimulateCall,
    clear: onClearData,
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{settingsContent.heading}</h2>
        <div className="panel-actions">
          <button className="action-btn" onClick={onToggleTheme}>
            {settingsContent.toggleThemeLabel}
          </button>
        </div>
      </div>
      <div className="settings-wrap">
        {settingsContent.rows.map(row => (
          <div className="setting-row" key={row.action}>
            <div>
              <div className="setting-label">{row.label}</div>
              <div className="setting-sub">{row.description}</div>
            </div>
            <div className="setting-ctrl">
              {row.action === 'theme' ? (
                <select
                  value={theme}
                  onChange={event => onThemeChange(event.target.value as ThemeName)}
                >
                  {row.options?.map(option => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <button className={row.buttonStyle} onClick={actionHandlers[row.action]}>
                  {row.buttonLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
