'use client'

import React from 'react'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppHeader } from '@/components/layout/AppHeader'
import { Sidebar } from '@/components/layout/Sidebar'
import { CallDetailModal } from '@/components/calls/CallDetailModal'
import { ToastStack } from '@/components/ui/ToastStack'
import { CurrentCallsView } from '@/components/views/CurrentCallsView'
import { HomeView } from '@/components/views/HomeView'
import { LiveCallView } from '@/components/views/LiveCallView'
import { PriorityView } from '@/components/views/PriorityView'
import { SettingsView } from '@/components/views/SettingsView'
import { useCallCenter } from '@/hooks/useCallCenter'
import type { ViewName } from '@/types/view'

/**
 * The CallSense dashboard.
 *
 * Deliberately nothing but composition: chrome, the active screen, and the two
 * overlays. All state lives in useCallCenter and all copy lives in data/, so
 * this file should only change when a screen is added or removed.
 *
 * Screens are mounted and unmounted rather than hidden, which is why each one
 * reads its state from the shared hook rather than holding its own. Switching
 * views must not discard a search term or a half-finished transcript.
 */
export default function DashboardPage() {
  const dashboard = useCallCenter()

  /**
   * Every screen, keyed by view.
   *
   * Typing this as a full Record<ViewName, ...> is the point: adding a name to
   * VIEW_NAMES without writing a screen for it is now a compile error. The
   * previous version was five independent `view === 'x' && <X/>` branches, so
   * a missing screen rendered an empty page and said nothing.
   *
   * Building all five elements on every render costs nothing. React elements
   * are plain objects; only the one that gets returned is ever mounted.
   */
  const screens: Record<ViewName, React.ReactNode> = {
    home: <HomeView stats={dashboard.stats} onSelectView={dashboard.setView} />,

    priority: (
      <PriorityView
        calls={dashboard.filteredPriority}
        filter={dashboard.priorityFilter}
        onFilterChange={dashboard.setPriorityFilter}
        dispatched={dashboard.dispatched}
        onSendUnits={dashboard.sendUnits}
        onOpenDetail={dashboard.setDetailModalId}
      />
    ),

    current: (
      <CurrentCallsView
        calls={dashboard.filteredCurrent}
        searchTerm={dashboard.searchTerm}
        onSearchChange={dashboard.setSearchTerm}
        transcriptVisible={dashboard.transcriptVisible}
        onToggleTranscript={dashboard.toggleTranscript}
        onOpenDetail={dashboard.setDetailModalId}
      />
    ),

    live: (
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
    ),

    settings: (
      <SettingsView
        theme={dashboard.theme}
        onThemeChange={dashboard.setTheme}
        onToggleTheme={dashboard.toggleTheme}
        onExportCsv={dashboard.exportCsv}
        onSimulateCall={dashboard.simulateCall}
        onClearData={dashboard.clearData}
      />
    ),
  }

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

        <main className="content">{screens[dashboard.view]}</main>
      </div>

      <AppFooter />

      <ToastStack toasts={dashboard.toasts} />

      <CallDetailModal
        callId={dashboard.detailModalId}
        call={dashboard.detailCall}
        onClose={() => dashboard.setDetailModalId(null)}
      />
    </div>
  )
}
