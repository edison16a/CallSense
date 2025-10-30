// app/callsense/page.tsx (or wherever you mount this component)
'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

// --- Seed helpers & fake data ----------------------------------------------
// ---------------------------------------------------------------------------

async function classifyTranscript(text: string): Promise<'High'|'Medium'|'Low'|'Unknown'> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `Transcript:\n${text}` },
                {
                  text:
                    `\nRate this high (if any guns or deaths involved), medium (if its a car crash or other), or low priority (Like cat stuck in tree or just feeling nervous). Please indicate in the response if it is high/medium/low use those exact words`
                }
              ]
            }
          ]
        })
      }
    )
    const json = await res.json()
    console.log(json)
    const ai = (json.candidates?.[0]?.content?.parts?.[0]?.text || 'medium').toLowerCase()
    if (ai.includes('high'))   return 'High'
    else if (ai.includes('medium')) return 'Medium'
    else if (ai.includes('low'))    return 'Low'
    return 'Unknown'
  } catch {
    return 'Unknown'
  }
}

async function askComfortingQuestions(text: string): Promise<string[]> {
  try {
    const parts = [
      `Transcript:\n${text}`,
      `\nWhat other helpful questions or comforting questions can I ask?`
    ]
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: parts.map(t => ({ text: t })) }
          ]
        })
      }
    )
    const data = (await res.json()) as { candidates?: { content?: string }[] }
    const raw: string = (data as any)?.candidates?.[0]?.content ?? ''
    return String(raw)
      .split(/\r?\n|•|–|—|-/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  } catch {
    return []
  }
}

async function askImportantDetails(text: string): Promise<string[]> {
  if (!text || !text.trim()) return []
  try {
    const promptLines = [
      `Using the following transcript, please return which details are important for law enforcement (address, name, and what's happening). If there is nothing important, return an empty space. Do not use formatting such as astericks or titles.`,
      `\nThen after that, using the transcript provided, make additional questions as needed to clarify the situation.`,
      `\nTranscript:\n${text}`
    ]
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [ { parts: promptLines.map(t => ({ text: t })) } ] })
      }
    )

    const data = await res.json() as {
      candidates?: Array<{ content?: any; output?: { content?: any } }>
    }

    const raw = data.candidates?.[0]?.content
             ?? data.candidates?.[0]?.output?.content
             ?? ''

    if (raw && typeof raw === 'object' && Array.isArray((raw as any).parts)) {
      const parts = (raw as any).parts as Array<{ text?: string }>
      return parts.map(p => p.text?.trim() ?? '').filter(Boolean)
    }

    if (Array.isArray(raw)) {
      return (raw as any[]).map(item => String(item).trim()).filter(s => s.length > 0)
    }

    const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const details = rawText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0)
    return details
  } catch (e) {
    console.error('askImportantDetails error →', e)
    return []
  }
}

async function askFurtherQuestions(text: string): Promise<string[]> {
  try {
    const parts = [
      `Using the following transcript, give me 5 questions I can ask to make the caller feel better or to ensure his safety.`,
      `\nTranscript:\n${text}`
    ]
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: parts.map(t => ({ text: t })) }
          ]
        })
      }
    )
    const data = (await res.json()) as { candidates?: { content?: string }[] }
    const raw: string = (data as any)?.candidates?.[0]?.content ?? ''
    return String(raw)
      .split(/\r?\n|•|–|—|-/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  } catch {
    return []
  }
}

interface PriorityCall {
  id: string
  level: 'High' | 'Medium' | 'Low'
  waitTime: string
}
interface CurrentCall {
  id: string
  transcript: string[]
}

const initialPriority: PriorityCall[] = []

// --- Small helpers (new) ----------------------------------------------------
const fmt = (n: number) => n.toLocaleString()
const randomWait = () => `${Math.ceil(Math.random() * 10)} min`
const nowStamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const STORAGE_KEYS = {
  priority: 'CALL_SENSE_priority',
  current: 'CALL_SENSE_current',
  view: 'CALL_SENSE_view',
  theme: 'CALL_SENSE_theme'
}

const demoTranscripts = [
  [
    'Caller: There is smoke coming from the building at 1243 Pine Ave.',
    'Caller: I think someone is inside yelling.',
    'Operator: Are there visible flames or just smoke?',
  ],
  [
    'Caller: I just witnessed a car crash on 5th and Main.',
    'Caller: One person looks hurt, airbags deployed.',
    'Operator: Are emergency lanes clear for first responders?',
  ],
  [
    'Caller: My cat is stuck on the roof again...',
    'Operator: Are you or the cat in immediate danger?',
  ],
]

// --- Toast Component ---------------------------------------------------------
function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number, msg: string }>>([])
  const push = useCallback((msg: string) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])
  const Toasts = () => (
    <div className="toast-wrap">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="toast"
          >
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
  return { push, Toasts }
}

// --- Modal Component ---------------------------------------------------------
function Modal({ open, title, children, onClose }:{
  open: boolean; title: string; children: React.ReactNode; onClose: () => void
}) {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-card"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="icon-btn" onClick={onClose}>✖</button>
          </div>
          <div className="modal-body">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function DashboardPage() {
  // NEW: add Home view + Settings
  const [view, setView] = useState<'home'|'priority' | 'current' | 'live' | 'settings'>('home')
  const [comfortingQuestions, setComfortingQuestions] = useState<string[]>([])
  const [furtherQuestions, setFurtherQuestions] = useState<string[]>([])

  // Lists
  const [priorityList, setPriorityList] = useState<PriorityCall[]>(initialPriority)
  const [currentCalls, setCurrentCalls] = useState<CurrentCall[]>([])
  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Filters + modal
  const [priorityFilter, setPriorityFilter] = useState<'All'|'High'|'Medium'|'Low'>('All')
  const [detailModalId, setDetailModalId] = useState<string | null>(null)

  // Transcription
  const [liveTranscripts, setLiveTranscripts] = useState<string[]>([])
  const [importantDetails, setImportantDetails] = useState<Record<number, string[]>>({})
  const [classification, setClassification] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const recognitionRef = useRef<any>(null)

  const [dispatched, setDispatched] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)

  // NEW: theme + sound + toast
  const [theme, setTheme] = useState<'light'|'dark'>(() => (typeof window !== 'undefined' && (localStorage.getItem(STORAGE_KEYS.theme) as any)) || 'light')
  const sendSound = useRef<HTMLAudioElement | null>(null)
  const doneSound = useRef<HTMLAudioElement | null>(null)
  const { push, Toasts } = useToast()

  // Keyboard Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return
      const k = e.key.toLowerCase()
      if (k === 'h') setView('home')
      if (k === 'l') setView('live')
      if (k === 'p') setView('priority')
      if (k === 'c') setView('current')
      if (k === 's') setView('settings')
      if (k === 't') toggleListening()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Load sounds
  useEffect(() => {
    sendSound.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYB...') // very short silent/placeholder
    doneSound.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYB...')
  }, [])

  // Persist + hydrate lists & view
  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_KEYS.priority)
      const c = localStorage.getItem(STORAGE_KEYS.current)
      const v = localStorage.getItem(STORAGE_KEYS.view) as any
      if (p) setPriorityList(JSON.parse(p))
      if (c) setCurrentCalls(JSON.parse(c))
      if (v) setView(v)
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.priority, JSON.stringify(priorityList)) } catch {}
  }, [priorityList])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(currentCalls)) } catch {}
  }, [currentCalls])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.view, view) } catch {}
  }, [view])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.theme, theme) } catch {}
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  // Speech recognition (kept)
  useEffect(() => {
    if (typeof window !== 'undefined' && !recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = false
        rec.lang = 'en-US'
        rec.onresult = (event: any) => {
          const transcript = Array.from(event.results).slice(event.resultIndex).map((r: any) => r[0].transcript).join('')
          setLiveTranscripts(prev => [...prev, `Caller: ${transcript}`])
        }
        rec.onerror = (e: any) => {
          console.error('Speech recognition error', e)
          setListening(false)
          push('Mic error — stopped listening.')
        }
        rec.onend = () => {
          setListening(false)
        }
        recognitionRef.current = rec
      }
    }
  }, [push])

  useEffect(() => {
    if (recognitionRef.current) {
      listening ? recognitionRef.current.start() : recognitionRef.current.stop()
    }
  }, [listening])

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const toggleListening = () => setListening(l => !l)
  const toggleTranscript = (id: string) =>
    setTranscriptVisible(prev => ({ ...prev, [id]: !prev[id] }))
  const sendUnits = (id: string, waitTime: string) => {
    setDispatched(prev => ({ ...prev, [id]: Date.now() }))
    sendSound.current?.play?.()
    push(`Units dispatched for ${id}`)
  }
  const handleHighlight = () => {
    push('Highlighted current text.')
  }
  const handleMarkDangerous = () => {
    setClassification('Manually marked as Dangerous')
    push('Call manually marked as dangerous.')
  }
  const handleAlert = () => {
    push('Emergency alert sent!')
  }

  const handleFurtherQuestions = async () => {
    const text = liveTranscripts.join('\n')
    const questions = await askFurtherQuestions(text)
    setFurtherQuestions(questions)
  }

  const handleEndCall = async () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setListening(false)

    // show loading and clear previous results
    setLoading(true)
    setClassification('')
    setComfortingQuestions([])
    setImportantDetails({})
    setFurtherQuestions([])

    // fake 3-second loading
    await new Promise(resolve => setTimeout(resolve, 3000))

    const text = liveTranscripts.join('\n') || 'Caller: (no transcript captured)'
    let level = await classifyTranscript(text)
    if (level === 'Unknown') {
      level = /fire|smoke|shots|gun/i.test(text)
        ? 'High'
        : /fight|missing|accident|burglary/i.test(text)
        ? 'Medium'
        : 'Low'
    }

    const newId = `CS-${Date.now().toString().slice(-6)}`
    const newCurrent: CurrentCall = {
      id: newId,
      transcript: [...liveTranscripts, `Analyzed Danger Level: ${level}`, `Timestamp: ${nowStamp()}`],
    }
    setCurrentCalls(prev => [newCurrent, ...prev.slice(0, 49)])

    const waitTime = randomWait()
    const newPriority = { id: newId, level, waitTime }
    setPriorityList(prev => [newPriority, ...prev.slice(0, 49)])

    setClassification(`AI Analysis: Danger Level: ${level}`)

    // get comforting questions
    const comforting = await askComfortingQuestions(text)
    setComfortingQuestions(comforting)

    // freeform important details
    const details = await askImportantDetails(text)
    setImportantDetails({ 0: details })

    // clear for next call
    setLiveTranscripts([])
    setLoading(false)
    doneSound.current?.play?.()
    push(`Call ${newId} analyzed as ${level}`)
    setView('priority')
  }

  // NEW: derived & utilities
  const filteredPriority = useMemo(() => {
    if (priorityFilter === 'All') return priorityList
    return priorityList.filter(p => p.level === priorityFilter)
  }, [priorityList, priorityFilter])

  const filteredCurrent = currentCalls.filter(call =>
    call.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    call.transcript.some(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const exportCSV = () => {
    const rows = [
      ['id', 'level', 'waitTime'],
      ...priorityList.map(p => [p.id, p.level, p.waitTime])
    ]
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `call_sense_priority_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    push('Exported CSV.')
  }

  const simulateCall = () => {
    const sample = demoTranscripts[Math.floor(Math.random() * demoTranscripts.length)]
    setLiveTranscripts(prev => [...prev, ...sample])
    push('Simulated transcript appended.')
    setView('live')
  }

  const clearData = () => {
    setPriorityList([])
    setCurrentCalls([])
    setDispatched({})
    push('All data cleared.')
  }

  const openDetail = (id: string) => {
    setDetailModalId(id)
  }

  const detailCall = useMemo(() => {
    if (!detailModalId) return null
    const call = currentCalls.find(c => c.id === detailModalId)
    return call || null
  }, [detailModalId, currentCalls])

  // Small stat cards for Home
  const stats = useMemo(() => {
    const total = priorityList.length
    const high = priorityList.filter(p => p.level === 'High').length
    const medium = priorityList.filter(p => p.level === 'Medium').length
    const low = priorityList.filter(p => p.level === 'Low').length
    return { total, high, medium, low }
  }, [priorityList])

  return (
    <div className="app-root">
      <header className="header">
        <div className="brand">
          <div className="cs-logo">
            <span className="cs-ring" />
            <span className="cs-initials">CS</span>
          </div>
          <div className="brand-text">
            <h1>Call Sense</h1>
            <p className="tag">Real-time triage, calm under pressure.</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="chip"
            onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
            title="Toggle theme (Light/Dark)"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button className="chip" onClick={simulateCall} title="Add a demo transcript">🎬 Demo</button>
          <button className="chip" onClick={exportCSV} title="Export priority as CSV">⬇️ Export</button>
          <div className="user-menu">
            <img className="user-avatar" src="https://api.dicebear.com/7.x/initials/svg?seed=CS" alt="User" />
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="sidebar-logo">
              <div className="cs-logo small">
                <span className="cs-ring" />
                <span className="cs-initials">CS</span>
              </div>
              <span className="sidebar-title">Navigator</span>
            </div>
            <div className="kbd-hint">H / L / P / C / S</div>
          </div>

          <div
            className={`nav-item ${view === 'home' ? 'active' : ''}`}
            onClick={() => setView('home')}
          >
            <span className="nav-icon">🏠</span><span>Home</span>
          </div>
          <div
            className={`nav-item ${view === 'live' ? 'active' : ''}`}
            onClick={() => setView('live')}
          >
            <span className="nav-icon">🎤</span><span>Live Call</span>
          </div>
          <div
            className={`nav-item ${view === 'priority' ? 'active' : ''}`}
            onClick={() => setView('priority')}
          >
            <span className="nav-icon">📞</span><span>Call Priority</span>
          </div>
          <div
            className={`nav-item ${view === 'current' ? 'active' : ''}`}
            onClick={() => setView('current')}
          >
            <span className="nav-icon">📝</span><span>Current Calls</span>
          </div>
          <div
            className={`nav-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            <span className="nav-icon">⚙️</span><span>Settings</span>
          </div>

          <div className="sidebar-bottom">
            <button className="danger-btn" onClick={clearData}>🗑️ Clear Data</button>
          </div>
        </aside>

        {/* main content */}
        <main className="content">
          {/* HOME */}
          {view === 'home' && (
            <section className="panel">
              <div className="panel-hero">
                <div className="hero-left">
                  <motion.h2
                    initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    We help call centers move faster and calmer.
                  </motion.h2>
                  <p>
                    Call Sense listening assists dispatchers with live transcription, AI-powered priority,
                    and auto-generated checklists and comfort questions. Reduce response times,
                    improve caller outcomes, and document everything — seamlessly.
                  </p>
                  <div className="hero-cta">
                    <button className="cta" onClick={() => setView('live')}>Start Live Call</button>
                    <button className="cta ghost" onClick={() => setView('priority')}>View Queue</button>
                  </div>
                </div>
                <div className="hero-right">
                  <div className="stat-grid">
                    <div className="stat">
                      <div className="stat-label">Open Items</div>
                      <div className="stat-value">{fmt(stats.total)}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">High Priority</div>
                      <div className="stat-value red">{fmt(stats.high)}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Medium</div>
                      <div className="stat-value amber">{fmt(stats.medium)}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Low</div>
                      <div className="stat-value green">{fmt(stats.low)}</div>
                    </div>
                  </div>
                  <div className="selling-points">
                    <div className="point">⚡ Real-time triage scoring</div>
                    <div className="point">🧭 Guided questions & prompts</div>
                    <div className="point">📄 Instant summaries & details</div>
                    <div className="point">🔐 Your dashboard, your data</div>
                  </div>
                </div>
              </div>

              <div className="panel-divider" />

              <div className="value-grid">
                <div className="value-card">
                  <h3>Why Call Sense</h3>
                  <p>Most calls are chaotic. We structure the chaos by extracting what matters,
                    suggesting the next best question, and keeping the dispatcher in control.</p>
                </div>
                <div className="value-card">
                  <h3>How it works</h3>
                  <p>Transcribe live, classify urgency with AI, auto-fill critical details,
                    and manage dispatch from one place. Export for reports anytime.</p>
                </div>
                <div className="value-card">
                  <h3>Built for teams</h3>
                  <p>Keyboard shortcuts, CSV export, dark mode, and a modern UX that feels fast.
                    Use it in training or production workflows.</p>
                </div>
              </div>
            </section>
          )}

          {/* PRIORITY */}
          {view === 'priority' && (
            <section className="panel">
              <div className="panel-header">
                <h2>Call Priority</h2>
                <div className="panel-actions">
                  {(['All','High','Medium','Low'] as const).map(level => (
                    <button
                      key={level}
                      className={`action-btn pill ${priorityFilter === level ? 'active' : ''}`}
                      onClick={() => setPriorityFilter(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="call-summary panel-header muted" style={{ fontWeight: 600 }}>
                <span className="call-from">Call ID</span>
                <span>Priority</span>
                <span>Wait Time</span>
                <span>Action</span>
              </div>
              <ul className="call-list">
                <AnimatePresence>
                  {filteredPriority.map(({ id, level, waitTime }) => {
                    const start = dispatched[id]
                    const totalMs = parseInt(waitTime) * 60000
                    const elapsed = start ? Date.now() - start : 0
                    const percent = start ? Math.min((elapsed / totalMs) * 100, 100) : 0

                    return (
                      <motion.li
                        key={id}
                        className="call-summary row"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                      >
                        <button className="linkish call-from" onClick={() => openDetail(id)} title="Open details">
                          {id}
                        </button>
                        <span className={`priority-badge ${level.toLowerCase()}`}>{level}</span>
                        <span className="text-sm mx-2">{waitTime}</span>

                        {start ? (
                          percent >= 100 ? (
                            <span className="finished">Finished</span>
                          ) : (
                            <div className="progress-wrap" title={`${percent.toFixed(0)}%`}>
                              <div className="progress-bar" style={{ width: `${percent}%` }} />
                              <span className="progress-emoji" style={{ left: `${percent}%` }}>🚔</span>
                            </div>
                          )
                        ) : (
                          <div className="row-actions">
                            <button className="toggle-btn" onClick={() => sendUnits(id, waitTime)}>Send Units</button>
                            <button className="ghost-btn" onClick={() => openDetail(id)}>Details</button>
                          </div>
                        )}
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            </section>
          )}

          {/* CURRENT */}
          {view === 'current' && (
            <section className="panel">
              <div className="panel-header">
                <h2>Current Calls</h2>
                <div className="panel-actions">
                  <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search calls..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <ul className="call-list">
                {filteredCurrent.map(({ id, transcript }) => (
                  <li key={id} className="call-item">
                    <div className="call-summary">
                      <span className="call-from">{id}</span>
                      <div className="row-actions">
                        <button className="ghost-btn" onClick={() => openDetail(id)}>Quick View</button>
                        <button
                          className="toggle-btn"
                          onClick={() => toggleTranscript(id)}
                        >
                          {transcriptVisible[id] ? 'Hide Transcript' : 'View Transcript'}
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {transcriptVisible[id] && (
                        <motion.div
                          className="transcript"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          {transcript.map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* LIVE */}
          {view === 'live' && (
            <section className="current-call-panel">
              <div className="current-call-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Live Call</h2>
                <div className="live-actions" style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className={`toggle-btn mic ${listening ? 'on' : ''}`}
                    onClick={toggleListening}
                    title="T to toggle"
                  >
                    {listening ? '🛑 Stop' : '🎤 Start'}
                  </button>
                  <button className="toggle-btn" onClick={handleHighlight}>Highlight Text</button>
                  <button className="toggle-btn warn" onClick={handleMarkDangerous}>Mark as Dangerous</button>
                  <button className="toggle-btn" onClick={handleFurtherQuestions}>Generate Questions</button>
                  <button className="toggle-btn success" onClick={handleEndCall}>End Call</button>
                </div>
              </div>

              <div className="live-transcript">
                <AnimatePresence>
                  {liveTranscripts.map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                    >
                      {line}
                    </motion.p>
                  ))}
                </AnimatePresence>
              </div>

              {loading ? (
                <div className="loading-panel">
                  <div className="skeleton-row" />
                  <div className="skeleton-row" />
                  <div className="skeleton-row short" />
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {classification && (
                      <motion.div
                        key="classification"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4 }}
                        className="classification"
                      >
                        {classification}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {comfortingQuestions.length > 0 && (
                    <div className="comforting-questions panel-section">
                      <h3>💬 Suggested Questions to Ask:</h3>
                      {comfortingQuestions.map((q, i) => (
                        <p key={i} className="comforting-question">{q}</p>
                      ))}
                    </div>
                  )}

                  {/* important details */}
                  <section className="important-details-panel panel-section">
                    <h3>📋 Important Details:</h3>
                    <ul className="important-details">
                      {Object.values(importantDetails)
                        .flat()
                        .filter(d => typeof d === 'string' && d.trim().length > 3)
                        .flatMap(detail =>
                          detail.split('\n').map(line => line.trim()).filter(line => line.length > 0)
                        )
                        .map((line, idx) => (
                          <React.Fragment key={idx}>
                            {idx === 1 && (<h3>❓ Questions:</h3>)}
                            <li className="important-detail">{line}</li>
                          </React.Fragment>
                        ))}
                    </ul>
                  </section>

                  {furtherQuestions.length > 0 && (
                    <div className="further-questions panel-section">
                      <h3>❓ Further Questions</h3>
                      {furtherQuestions.map((q, i) => (
                        <p key={i} className="further-question">{q}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* SETTINGS */}
          {view === 'settings' && (
            <section className="panel">
              <div className="panel-header">
                <h2>Settings</h2>
                <div className="panel-actions">
                  <button className="action-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
                    Toggle Theme
                  </button>
                </div>
              </div>
              <div className="settings-wrap">
                <div className="setting-row">
                  <div>
                    <div className="setting-label">Theme</div>
                    <div className="setting-sub">Choose your preferred theme.</div>
                  </div>
                  <div className="setting-ctrl">
                    <select
                      value={theme}
                      onChange={e => setTheme(e.target.value as any)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <div className="setting-label">CSV Export</div>
                    <div className="setting-sub">Download current priority queue.</div>
                  </div>
                  <div className="setting-ctrl">
                    <button className="toggle-btn" onClick={exportCSV}>Export Priority</button>
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <div className="setting-label">Demo Data</div>
                    <div className="setting-sub">Append a sample transcript to Live Call.</div>
                  </div>
                  <div className="setting-ctrl">
                    <button className="ghost-btn" onClick={simulateCall}>Add Demo Transcript</button>
                  </div>
                </div>

                <div className="setting-row">
                  <div>
                    <div className="setting-label">Danger Zone</div>
                    <div className="setting-sub">Irreversible actions.</div>
                  </div>
                  <div className="setting-ctrl">
                    <button className="danger-btn" onClick={clearData}>Clear All Data</button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="footer">
        <div>© {new Date().getFullYear()} Call Sense</div>
        <div className="footer-right">Built with ❤️ for dispatchers</div>
      </footer>

      <Toasts />

      {/* Detail Modal */}
      <Modal
        open={!!detailModalId}
        title={detailModalId ? `Call Details — ${detailModalId}` : 'Call Details'}
        onClose={() => setDetailModalId(null)}
      >
        {!detailCall ? (
          <div>No transcript found.</div>
        ) : (
          <div className="detail-scroll">
            {detailCall.transcript.map((t, i) => <p key={i}>{t}</p>)}
          </div>
        )}
      </Modal>
    </div>
  )
}
