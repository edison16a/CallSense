'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

async function classifyTranscript(text: string): Promise<'High' | 'Medium' | 'Low' | 'Unknown'> {
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
                  text: `Transcript:\n${text}`
                },
                {
                  text: `\nRate this high (if any guns or deaths involved), medium (if its a car crash or other), or low priority (Like cat stuck in tree or just feeling nervous). Please indicate in the response if it is high/medium/low use those exact words`
                }
              ]
            }
          ]
        })
      }
    )

    const json = await res.json()
    console.log(json)

    const ai = (json.candidates?.[0]?.content.parts[0].text || 'medium').toLowerCase()

    if (ai.includes('high')) {
      return 'High'
    } else if (ai.includes('medium')) {
      return 'Medium'
    } else if (ai.includes('low')) {
      return 'Low'
    }

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
    const raw: string = data.candidates?.[0]?.content ?? ''

    return raw
      .split(/\r?\n|•|–/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  } catch {
    return []
  }
}

async function askImportantDetails(text: string): Promise<string[]> {
  if (!text || !text.trim()) {
    return []
  }

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
        body: JSON.stringify({
          contents: [
            { parts: promptLines.map(t => ({ text: t })) }
          ]
        })
      }
    )

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: any
        output?: { content?: any }
      }>
    }

    const raw =
      data.candidates?.[0]?.content ??
      data.candidates?.[0]?.output?.content ??
      ''

    if (
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as any).parts)
    ) {
      const parts = (raw as any).parts as Array<{ text?: string }>
      return parts
        .map(p => p.text?.trim() ?? '')
        .filter(Boolean)
    }

    if (Array.isArray(raw)) {
      return (raw as any[])
        .map(item => String(item).trim())
        .filter(s => s.length > 0)
    }

    const rawText = typeof raw === 'string' ? raw : JSON.stringify(raw)
    const details = rawText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)

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

const initialPriority: PriorityCall[] = []

export default function DashboardPage() {
  // View state
  const [view, setView] = useState<'priority' | 'current' | 'live'>('priority')

  // Question suggestions
  const [comfortingQuestions, setComfortingQuestions] = useState<string[]>([])
  const [furtherQuestions, setFurtherQuestions] = useState<string[]>([])

  // Call lists
  const [priorityList, setPriorityList] = useState<PriorityCall[]>(initialPriority)
  const [currentCalls, setCurrentCalls] = useState<CurrentCall[]>([])
  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Live transcription
  const [liveTranscripts, setLiveTranscripts] = useState<string[]>([])
  const [importantDetails, setImportantDetails] = useState<Record<number, string[]>>({})
  const [classification, setClassification] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const recognitionRef = useRef<any>(null)

  // ID and dispatch tracking
  const nextId = useRef(4)
  const [dispatched, setDispatched] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)

  // ----------------------------------------
  // Speech recognition setup
  // ----------------------------------------
  useEffect(() => {
    if (typeof window !== 'undefined' && !recognitionRef.current) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition

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
          setLiveTranscripts(prev => [...prev, `Caller: ${transcript}`])
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

  useEffect(() => {
    if (recognitionRef.current) {
      listening
        ? recognitionRef.current.start()
        : recognitionRef.current.stop()
    }
  }, [listening])

  // Tick for UI updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // ----------------------------------------
  // Event handlers
  // ----------------------------------------
  const toggleListening = () => setListening(l => !l)

  const toggleTranscript = (id: string) =>
    setTranscriptVisible(prev => ({ ...prev, [id]: !prev[id] }))

  const sendUnits = (id: string, waitTime: string) =>
    setDispatched(prev => ({ ...prev, [id]: Date.now() }))

  const handleHighlight = () => alert('Highlighting current text')
  const handleMarkDangerous = () => setClassification('Manually marked as Dangerous')
  const handleAlert = () => alert('Emergency alert sent!')

  const handleFurtherQuestions = async () => {
    const text = liveTranscripts.join('\n')
    const questions = await askFurtherQuestions(text)
    setFurtherQuestions(questions)
  }

  const handleEndCall = async () => {
    // Stop recognition
    if (recognitionRef.current) recognitionRef.current.stop()
    setListening(false)

    // Show loading and reset previous data
    setLoading(true)
    setClassification('')
    setComfortingQuestions([])
    setImportantDetails({})
    setFurtherQuestions([])

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000))

    const text = liveTranscripts.join('\n')
    let level = await classifyTranscript(text)

    if (level === 'Unknown') {
      level = /fire|smoke|shots|gun/i.test(text)
        ? 'High'
        : /fight|missing|accident|burglary/i.test(text)
        ? 'Medium'
        : 'Low'
    }

    // Generate new call ID
    const idNum = nextId.current++
    const newId = `2025-05-24-${String(idNum).padStart(3, '0')}`

    // Add to current calls
    const newCurrent: CurrentCall = {
      id: newId,
      transcript: [...liveTranscripts, `Analyzed Danger Level: ${level}`]
    }
    setCurrentCalls(prev => [newCurrent, ...prev.slice(0, 9)])

    // Add to priority list
    const waitTime = `${Math.ceil(Math.random() * 10)} min`
    const newPriority = { id: newId, level, waitTime }
    setPriorityList(prev => [newPriority, ...prev.slice(0, 9)])

    setClassification(`AI Analysis: Danger Level: ${level}`)

    // Fetch comforting questions
    const comforting = await askComfortingQuestions(text)
    setComfortingQuestions(comforting)

    // Fetch important details
    const details = await askImportantDetails(text)
    setImportantDetails({ 0: details })

    // Reset live transcripts
    setLiveTranscripts([])
    setLoading(false)
  }

  // ----------------------------------------
  // Filtering logic
  // ----------------------------------------
  const filteredPriority = priorityList

  const filteredCurrent = currentCalls.filter(call =>
    call.id.includes(searchTerm) ||
    call.transcript.some(line =>
      line.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div
          className={`nav-item ${view === 'live' ? 'active' : ''}`}
          onClick={() => setView('live')}
        >
          <span className="nav-icon">🎤</span>
          <span>Live Call</span>
        </div>
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
      </aside>

      {/* Main content */}
      <main className="content">
        {/* Priority view */}
        {view === 'priority' && (
          <section className="panel">
            <div className="panel-header">
              <h2>Call Priority</h2>
              <div className="panel-actions">
                {(['All', 'High', 'Medium', 'Low'] as const).map(level => (
                  <button key={level} className="action-btn">
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="call-summary panel-header"
              style={{ fontWeight: 'bold' }}
            >
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
                const percent = start
                  ? Math.min((elapsed / totalMs) * 100, 100)
                  : 0

                return (
                  <li key={id} className="call-summary">
                    <span className="call-from">{id}</span>
                    <span className={`priority-badge ${level.toLowerCase()}`}>
                      {level}
                    </span>
                    <span className="text-sm mx-2">{waitTime}</span>

                    {start ? (
                      percent >= 100 ? (
                        <span style={{ fontWeight: 'bold' }}>Finished</span>
                      ) : (
                        <div
                          style={{
                            position: 'relative',
                            width: '100px',
                            height: '20px',
                            background: '#eee',
                            borderRadius: '4px'
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              height: '100%',
                              transition: 'width 1s linear',
                              background: '#4caf50'
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              left: `${percent}%`,
                              top: 0
                            }}
                          >
                            🚔
                          </span>
                        </div>
                      )
                    ) : (
                      <button
                        className="toggle-btn"
                        onClick={() => sendUnits(id, waitTime)}
                      >
                        Send Units
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Current calls view */}
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
                        ? 'Hide Transcript'
                        : 'View Transcript'}
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

        {/* Live call view */}
        {view === 'live' && (
          <section className="current-call-panel">
            <div
              className="current-call-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h2>Live Call</h2>
              <div
                className="live-actions"
                style={{ display: 'flex', gap: '10px' }}
              >
                <button
                  className="toggle-btn"
                  style={{
                    backgroundColor: '#007bff',
                    color: '#fff',
                    borderRadius: '50%',
                    padding: '8px',
                    fontSize: '18px'
                  }}
                  onClick={toggleListening}
                >
                  🎤
                </button>
                <button className="toggle-btn" onClick={handleHighlight}>
                  Highlight Text
                </button>
                <button className="toggle-btn" onClick={handleMarkDangerous}>
                  Mark as Dangerous
                </button>
                <button className="toggle-btn" onClick={handleFurtherQuestions}>
                  Generate Questions
                </button>
                <button className="toggle-btn" onClick={handleEndCall}>
                  End Call
                </button>
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

            {loading ? (
              <div className="loading-panel">
                <p>Loading...</p>
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
                      <p key={i} className="comforting-question">
                        {q}
                      </p>
                    ))}
                  </div>
                )}

                {/* Important Details */}
                <section className="important-details-panel panel-section">
                  <h3>📋 Important Details:</h3>
                  <ul>
                    {Object.values(importantDetails)
                      .flat()
                      .filter(d => typeof d === 'string' && d.trim().length > 3)
                      .flatMap(detail =>
                        detail
                          .split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0)
                      )
                      .map((line, idx) => (
                        <React.Fragment key={idx}>
                          {/* After the first bullet, insert questions header */}
                          {idx === 1 && <h3>❓ Questions:</h3>}
                          <li className="important-detail">{line}</li>
                        </React.Fragment>
                      ))}
                  </ul>
                </section>

                {furtherQuestions.length > 0 && (
                  <div className="further-questions panel-section">
                    <h3>❓ Further Questions</h3>
                    {furtherQuestions.map((q, i) => (
                      <p key={i} className="further-question">
                        {q}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
