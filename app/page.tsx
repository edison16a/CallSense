'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/** ─── ADD YOUR GEMINI KEY ───────────────────────────────────────────────── **/
const GEMINI_API_KEY = 'AIzaSyD-ipc8Yrren25424KBLOutdUPHnLICbSA'

/** ─── HELPER TO CALL GEMINI ─────────────────────────────────────────────── **/
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
                {
                  text: `Transcript: ${text}\nRate this high, medium, or low priority.`
                }
              ]
            }
          ]
        })
      }
    )
    const json = await res.json()
    const ai = (json.candidates?.[0]?.content || '').toLowerCase()
    if (ai.includes('high'))   return 'High'
    if (ai.includes('medium')) return 'Medium'
    if (ai.includes('low'))    return 'Low'
    return 'Unknown'
  } catch {
    return 'Unknown'
  }
}

async function askComfortingQuestions(text: string): Promise<string[]> {
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
                {
                  text: `Transcript: ${text}\nWhat other helpful questions or comforting questions can I ask?`
                }
              ]
            }
          ]
        })
      }
    )
    const data = (await res.json()) as { candidates?: { content?: string }[] }
    const raw: string = data.candidates?.[0]?.content ?? ''
    return raw
      .split(/\r?\n|•|–/)
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

const initialPriority: PriorityCall[] = [
  { id: '2025-05-24-001', level: 'High',   waitTime: '5 min' },
  { id: '2025-05-24-002', level: 'Medium', waitTime: '7 min' },
  { id: '2025-05-24-003', level: 'Low',    waitTime: '3 min' },
]

export default function DashboardPage() {
  // Sidebar view
  const [view, setView] = useState<'priority' | 'current' | 'live'>('priority')
  const [comfortingQuestions, setComfortingQuestions] = useState<string[]>([])

  // Lists state
  const [priorityList, setPriorityList] = useState<PriorityCall[]>(initialPriority)
  const [currentCalls, setCurrentCalls] = useState<CurrentCall[]>([])
  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // For live call transcription
  const [liveTranscripts, setLiveTranscripts] = useState<string[]>([])
  const [classification, setClassification] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const nextId = useRef(4)

  // Dispatch tracking
  const [dispatched, setDispatched] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)

  // Setup browser speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && !recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = false
        rec.lang = 'en-US'
        rec.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .slice(event.resultIndex)
            .map((r: any) => r[0].transcript)
            .join('')
          setLiveTranscripts(prev => [...prev, `User: ${transcript}`])
        }
        rec.onerror = (e: any) => {
          console.error('Speech recognition error', e)
          setListening(false)
        }
        rec.onend = () => {
          setListening(false)
        }
        recognitionRef.current = rec
      }
    }
  }, [])

  // Start/stop recognition when listening toggles
  useEffect(() => {
    if (recognitionRef.current) {
      if (listening) recognitionRef.current.start()
      else recognitionRef.current.stop()
    }
  }, [listening])

  // Forcing re-render every second to update progress bars
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const toggleListening = () => setListening(l => !l)

  const toggleTranscript = (id: string) =>
    setTranscriptVisible(prev => ({ ...prev, [id]: !prev[id] }))

  const sendUnits = (id: string, waitTime: string) => {
    setDispatched(prev => ({ ...prev, [id]: Date.now() }))
  }

  const handleHighlight = () => alert('Highlighting current text')
  const handleMarkDangerous = () => setClassification('Manually marked as Dangerous')
  const handleAlert = () => alert('Emergency alert sent!')

  const handleEndCall = async () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setListening(false)

    const text = liveTranscripts.join(' ')
    let level = await classifyTranscript(text)
    if (level === 'Unknown') {
      level = /fire|smoke|shots|gun/i.test(text)
        ? 'High'
        : /fight|missing|accident|burglary/i.test(text)
        ? 'Medium'
        : 'Low'
    }

    const idNum = nextId.current++
    const newId = `2025-05-24-${String(idNum).padStart(3, '0')}`

    const newCurrent: CurrentCall = {
      id: newId,
      transcript: [...liveTranscripts, `AI Highlight: Danger Level: ${level}`],
    }
    setCurrentCalls(prev => [newCurrent, ...prev.slice(0, 9)])

    const waitTime = `${Math.ceil(Math.random() * 10)} min`
    const newPriority: PriorityCall = { id: newId, level, waitTime }
    setPriorityList(prev => [newPriority, ...prev.slice(0, 9)])

    setClassification(`AI Highlight: Danger Level: ${level}`)
    const questions = await askComfortingQuestions(text)
    setComfortingQuestions(questions)

    setLiveTranscripts([])
  }

  const filteredPriority = priorityList
  const filteredCurrent = currentCalls.filter(call =>
    call.id.includes(searchTerm) ||
    call.transcript.some(line =>
      line.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div
          className={`nav-item ${view === 'priority' ? 'active' : ''}`}
          onClick={() => setView('priority')}
        >
          <span className="nav-icon">📞</span>
          <span>Call Priority</span>
        </div>
        <div
          className={`nav-item ${view === 'current' ? 'active' : ''}`}
          onClick={() => setView('current')}
        >
          <span className="nav-icon">📝</span>
          <span>Current Calls</span>
        </div>
        <div
          className={`nav-item ${view === 'live' ? 'active' : ''}`}
          onClick={() => setView('live')}
        >
          <span className="nav-icon">🎤</span>
          <span>Live Call</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="content">
        {/* Priority View */}
        {view === 'priority' && (
          <section className="panel">
            <div className="panel-header">
              <h2>Call Priority</h2>
              <div className="panel-actions">
                {(['All','High','Medium','Low'] as const).map(level => (
                  <button key={level} className="action-btn">{level}</button>
                ))}
              </div>
            </div>
            <div className="call-summary panel-header" style={{ fontWeight: 'bold' }}>
              <span className="call-from">Call ID</span>
              <span>Priority</span>
              <span>Wait Time</span>
              <span>Action</span>
            </div>
            <ul className="call-list">
              {filteredPriority.map(({ id, level, waitTime }) => {
                const start = dispatched[id]
                const totalMs = parseInt(waitTime) * 60000
                const elapsed = start ? Date.now() - start : 0
                const percent = start ? Math.min((elapsed / totalMs) * 100, 100) : 0

                return (
                  <li key={id} className="call-summary">
                    <span className="call-from">{id}</span>
                    <span className={`priority-badge ${level.toLowerCase()}`}>{level}</span>
                    <span className="text-sm mx-2">{waitTime}</span>

                    {start ? (
                      percent >= 100 ? (
                        <span style={{ fontWeight: 'bold' }}>Finished</span>
                      ) : (
                        <div style={{ position: 'relative', width: '100px', height: '20px', background: '#eee', borderRadius: '4px' }}>
                          <div
                            style={{
                              width: `${percent}%`,
                              height: '100%',
                              transition: 'width 1s linear',
                              background: '#4caf50'
                            }}
                          />
                          <span style={{ position: 'absolute', left: `${percent}%`, top: 0 }}>🚔</span>
                        </div>
                      )
                    ) : (
                      <button className="toggle-btn" onClick={() => sendUnits(id, waitTime)}>
                        Send Units
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Current Calls View */}
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
                    <button
                      className="toggle-btn"
                      onClick={() => toggleTranscript(id)}
                    >
                      {transcriptVisible[id]
                        ? 'Hide AI Highlight'
                        : 'View AI Highlight'}
                    </button>
                  </div>
                  {transcriptVisible[id] && (
                    <div className="transcript">
                      {transcript.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Live Call View */}
        {view === 'live' && (
          <section className="current-call-panel">
            <div
              className="current-call-header"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h2>Live Call</h2>
              <div className="live-actions" style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="toggle-btn"
                  style={{ backgroundColor: '#007bff', color: '#fff', borderRadius: '50%', padding: '8px', fontSize: '18px' }}
                  onClick={toggleListening}
                >
                  🎤
                </button>
                <button className="toggle-btn" onClick={handleHighlight}>Highlight Text</button>
                <button className="toggle-btn" onClick={handleMarkDangerous}>Mark as Dangerous</button>
                <button className="toggle-btn" onClick={handleAlert}>Alert</button>
                <button className="toggle-btn" onClick={handleEndCall}>End Call</button>
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
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    {line}
                  </motion.p>
                ))}
              </AnimatePresence>
            </div>
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
          </section>
        )}
      </main>
    </div>
  )
}
