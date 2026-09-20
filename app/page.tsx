'use client'

import React from 'react'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppHeader } from '@/components/layout/AppHeader'
import { Sidebar } from '@/components/layout/Sidebar'
import { CallDetailModal } from '@/components/calls/CallDetailModal'
import { CurrentCallsView } from '@/components/views/CurrentCallsView'
import { HomeView } from '@/components/views/HomeView'
import { LiveCallView } from '@/components/views/LiveCallView'
import { PriorityView } from '@/components/views/PriorityView'
import { SettingsView } from '@/components/views/SettingsView'
import { useCallCenter } from '@/hooks/useCallCenter'

/**
 * The CallSense dashboard.
 *
 * Deliberately nothing but composition: chrome, a switch over the active
 * view, and the two overlays. All state lives in useCallCenter and all copy
 * lives in data/, so this file should only ever change when a screen is added
 * or removed.
 *
 * Screens are mounted and unmounted rather than hidden, which is why each one
 * reads its state from the shared hook rather than holding its own - switching
 * views must not discard a search term or a half-finished transcript.
 */
export default function DashboardPage() {
  const dashboard = useCallCenter()
  const { Toasts } = dashboard

  return (
    <div className="app-root">
      <AppHeader
        theme={dashboard.theme}
        onToggleTheme={dashboard.toggleTheme}
        onSimulateCall={dashboard.simulateCall}
        onExportCsv={dashboard.exportCsv}
      />

      <div className="dashboard-container">
        <Sidebar
          view={dashboard.view}
          onSelectView={dashboard.setView}
          onClearData={dashboard.clearData}
        />

        <main className="content">
          {dashboard.view === 'home' && (
            <HomeView stats={dashboard.stats} onSelectView={dashboard.setView} />
          )}

          {dashboard.view === 'priority' && (
            <PriorityView
              calls={dashboard.filteredPriority}
              filter={dashboard.priorityFilter}
              onFilterChange={dashboard.setPriorityFilter}
              dispatched={dashboard.dispatched}
              onSendUnits={dashboard.sendUnits}
              onOpenDetail={dashboard.setDetailModalId}
            />
          )}

          {dashboard.view === 'current' && (
            <CurrentCallsView
              calls={dashboard.filteredCurrent}
              searchTerm={dashboard.searchTerm}
              onSearchChange={dashboard.setSearchTerm}
              transcriptVisible={dashboard.transcriptVisible}
              onToggleTranscript={dashboard.toggleTranscript}
              onOpenDetail={dashboard.setDetailModalId}
            />
          )}

          {dashboard.view === 'live' && (
            <LiveCallView
              liveTranscripts={dashboard.liveTranscripts}
              listening={dashboard.listening}
              onToggleListening={dashboard.toggleListening}
              onHighlight={dashboard.handleHighlight}
              onMarkDangerous={dashboard.handleMarkDangerous}
              onGenerateQuestions={dashboard.handleFurtherQuestions}
              onEndCall={dashboard.handleEndCall}
              loading={dashboard.loading}
              classification={dashboard.classification}
              comfortingQuestions={dashboard.comfortingQuestions}
              furtherQuestions={dashboard.furtherQuestions}
              importantDetails={dashboard.importantDetails}
            />
          )}

          {dashboard.view === 'settings' && (
            <SettingsView
              theme={dashboard.theme}
              onThemeChange={dashboard.setTheme}
              onToggleTheme={dashboard.toggleTheme}
              onExportCsv={dashboard.exportCsv}
              onSimulateCall={dashboard.simulateCall}
              onClearData={dashboard.clearData}
            />
          )}
        </main>
      </div>

      <AppFooter />

      <Toasts />

      <CallDetailModal
        callId={dashboard.detailModalId}
        call={dashboard.detailCall}
        onClose={() => dashboard.setDetailModalId(null)}
      />
    </div>
  )
}
