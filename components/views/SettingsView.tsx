'use client'

import React from 'react'
import { settingsContent, type SettingsButtonAction } from '@/lib/content'
import { isThemeName, type ThemeName } from '@/lib/theme'

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
 * descriptions and button styling editable without code while the behaviour
 * itself stays type-checked. lib/content.ts rejects an unknown action at
 * startup, and the handler map below is keyed by the action type, so adding
 * an action without wiring it up will not compile.
 */
export function SettingsView({
  theme,
  onThemeChange,
  onToggleTheme,
  onExportCsv,
  onSimulateCall,
  onClearData,
}: SettingsViewProps) {
  const actionHandlers: Record<SettingsButtonAction, () => void> = {
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
                  onChange={event => {
                    // The dropdown can only offer what is in the data file, so
                    // an unrecognised value means that file is wrong. Ignore it
                    // rather than pushing a bad theme into localStorage.
                    if (isThemeName(event.target.value)) onThemeChange(event.target.value)
                  }}
                >
                  {row.options?.map(option => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  className={row.buttonStyle}
                  onClick={actionHandlers[row.action as SettingsButtonAction]}
                >
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
