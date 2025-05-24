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
    );
    // cast to help TS infer types
    const data = (await res.json()) as { candidates?: { content?: string }[] };
    // ensure raw is a string
    const raw: string = data.candidates?.[0]?.content ?? '';
    // split on newlines or common list markers, trim and filter out empties
    return raw
      .split(/\r?\n|•|–/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  } catch (error) {
    console.error('askComfortingQuestions error:', error);
    return [];
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


// INITIAL PRIORITY LIST (2025-05-24 IDs + wait times)
const initialPriority: PriorityCall[] = [
  { id: '2025-05-24-001', level: 'High',   waitTime: '5 min' },
  { id: '2025-05-24-002', level: 'Medium', waitTime: '7 min' },
  { id: '2025-05-24-003', level: 'Low',    waitTime: '3 min' },
]

// SAMPLE CONVERSATIONS: 10 transcripts, each with 10 lines
const sampleTranscripts: string[][] = [
  [
    'Dispatcher: “911, what is your emergency?”',
    'Caller: “There is a fire at 123 Elm St.”',
    'Dispatcher: “What floor is the fire on?”',
    'Caller: “Second floor.”',
    'Dispatcher: “Are there any injuries?”',
    'Caller: “No injuries yet.”',
    'Dispatcher: “Fire department is en route.”',
    'Caller: “Please hurry.”',
    'Dispatcher: “Stay on the line and exit safely.”',
    'Caller: “Okay, thank you.”'
  ],
  [
    'Dispatcher: “911, state your emergency.”',
    'Caller: “Someone is breaking into my house.”',
    'Dispatcher: “Are you in a safe location?”',
    'Caller: “I am hiding in a closet.”',
    'Dispatcher: “Police are on the way.”',
    'Caller: “Please be quick.”',
    'Dispatcher: “Maintain silence; help is coming.”',
    'Caller: “Thank you.”',
    'Dispatcher: “Officers will arrive shortly.”',
    'Caller: “Got it.”'
  ],
  [
    'Dispatcher: “911, what happened?”',
    'Caller: “I heard gunshots outside.”',
    'Dispatcher: “Where are you located?”',
    'Caller: “456 Oak Ave.”',
    'Dispatcher: “What type of building?”',
    'Caller: “Apartment complex.”',
    'Dispatcher: “Police are responding now.”',
    'Caller: “Stay inside.”',
    'Dispatcher: “Lock doors and stay hidden.”',
    'Caller: “Understood.”'
  ],
  [
    'Dispatcher: “911, can you describe your emergency?”',
    'Caller: “I was in a car accident.”',
    'Dispatcher: “Are you injured?”',
    'Caller: “Minor cuts.”',
    'Dispatcher: “Ambulance and police en route.”',
    'Caller: “Thank you.”',
    'Dispatcher: “Stay in your vehicle.”',
    'Caller: “Okay.”',
    'Dispatcher: “Help is arriving.”',
    'Caller: “Good.”'
  ],
  [
    'Dispatcher: “911, what is the address?”',
    'Caller: “789 Pine Rd, possible break-in.”',
    'Dispatcher: “Describe the suspect.”',
    'Caller: “Male, black jacket.”',
    'Dispatcher: “Police are arriving.”',
    'Caller: “I will wait inside.”',
    'Dispatcher: “Stay on the line.”',
    'Caller: “Yes.”',
    'Dispatcher: “Units are there.”',
    'Caller: “Thanks.”'
  ],
  [
    'Dispatcher: “911, go ahead.”',
    'Caller: “My neighbor needs medical help.”',
    'Dispatcher: “What is the issue?”',
    'Caller: “He collapsed.”',
    'Dispatcher: “EMS is dispatched.”',
    'Caller: “Please hurry.”',
    'Dispatcher: “Are you performing CPR?”',
    'Caller: “Yes, I am.”',
    'Dispatcher: “Continue until help arrives.”',
    'Caller: “Okay.”'
  ],
  [
    'Dispatcher: “911, what is the nature of the call?”',
    'Caller: “Dog is attacking me.”',
    'Dispatcher: “Where are you?”',
    'Caller: “Central Park.”',
    'Dispatcher: “Animal control and EMS sent.”',
    'Caller: “I am bleeding.”',
    'Dispatcher: “Apply pressure to wound.”',
    'Caller: “Doing it.”',
    'Dispatcher: “Help is arriving.”',
    'Caller: “Thank you.”'
  ],
  [
    'Dispatcher: “911, what emergency?”',
    'Caller: “Gas leak smell inside.”',
    'Dispatcher: “Evacuate immediately.”',
    'Caller: “Leaving now.”',
    'Dispatcher: “Fire and hazmat on the way.”',
    'Caller: “Okay.”',
    'Dispatcher: “Stay clear of building.”',
    'Caller: “Understood.”',
    'Dispatcher: “Hazmat crew there.”',
    'Caller: “Thank you.”'
  ],
  [
    'Dispatcher: “911, tell me the problem.”',
    'Caller: “My child is missing.”',
    'Dispatcher: “When was last seen?”',
    'Caller: “20 minutes ago.”',
    'Dispatcher: “Sending search teams.”',
    'Caller: “Please find her.”',
    'Dispatcher: “Stay on the line.”',
    'Caller: “Okay.”',
    'Dispatcher: “Teams are searching.”',
    'Caller: “Thank you.”'
  ],
  [
    'Dispatcher: “911, what can I help you with?”',
    'Caller: “There’s a chemical spill.”',
    'Dispatcher: “Where?”',
    'Caller: “Downtown lab.”',
    'Dispatcher: “Hazmat and police dispatched.”',
    'Caller: “Evacuating area.”',
    'Dispatcher: “Keep back.”',
    'Caller: “Yes.”',
    'Dispatcher: “Units arriving.”',
    'Caller: “Thanks.”'
  ],
]

export default function DashboardPage() {
  // Sidebar view
  const [view, setView] = useState<'priority' | 'current' | 'live'>('priority')
  const [comfortingQuestions, setComfortingQuestions] = useState<string[]>([]);


  // Lists state
  const [priorityList, setPriorityList] = useState<PriorityCall[]>(initialPriority)
  const [currentCalls, setCurrentCalls] = useState<CurrentCall[]>([])
  const [transcriptVisible, setTranscriptVisible] = useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = useState('')

  // Filter for priority level
  const [priorityFilter, setPriorityFilter] = useState<'All'|'High'|'Medium'|'Low'>('All')

  // Live-call transcripts & classification
  const [liveTranscripts, setLiveTranscripts] = useState<string[]>([])
  const [classification, setClassification] = useState('')
  const nextId = useRef(4)

  // Dispatch tracking
  const [dispatched, setDispatched] = useState<Record<string, number>>({})
  const [tick, setTick] = useState(0)

  // Forcing re-render every second to update progress bars
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Toggle transcript visibility
  const toggleTranscript = (id: string) =>
    setTranscriptVisible(prev => ({ ...prev, [id]: !prev[id] }))

  // Send Units handler with dispatch progress
  const sendUnits = (id: string, waitTime: string) => {

    setDispatched(prev => ({ ...prev, [id]: Date.now() }))
  }

  // Manual action handlers for live call
  const handleHighlight = () => alert('Highlighting current text')
  const handleMarkDangerous = () => setClassification('Manually marked as Dangerous')
  const handleEndCall = () => alert('Call ended')
  const handleAlert = () => alert('Emergency alert sent!')

  // Filtered lists
  const filteredPriority =
    priorityFilter === 'All'
      ? priorityList
      : priorityList.filter(c => c.level === priorityFilter)

  const filteredCurrent = currentCalls.filter(call =>
    call.id.includes(searchTerm) ||
    call.transcript.some(line =>
      line.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Auto-run long conversations
  useEffect(() => {
    let active = true

    async function runConversation() {
      while (active) {
        setLiveTranscripts([])
        setClassification('')

        // pick a random convo
        const convo = sampleTranscripts[
          Math.floor(Math.random() * sampleTranscripts.length)
        ]

        // play through it with 1–5s random delays
        for (const line of convo) {
          if (!active) return
          setLiveTranscripts(prev => [...prev, line])
          const delay = 1000 + Math.random() * 4000  // between 1s and 5s
          await new Promise(r => setTimeout(r, delay))
        }



        const text = convo.join(' ')
        let level = await classifyTranscript(text)
        if (level === 'Unknown') {
          level = /fire|smoke|shots|gun/i.test(text)
          ? 'High'
          : /fight|missing|accident|disoriented|burglary/i.test(text)
          ? 'Medium'
          : 'Low'
        }

        // generate IDs
        const idNum = String(nextId.current++).padStart(3, '0')
        const newId = `2025-05-24-${idNum}`

        // add to current
        const newCurrent: CurrentCall = {
          id: newId,
          transcript: [
            ...convo,
            `AI Highlight: Danger Level: ${level}`,
          ],
        }
        setCurrentCalls(prev => [newCurrent, ...prev.slice(0, 9)])

        // add to priority
        const waitTime = `${Math.ceil(Math.random() * 10)} min`
        const newPriority: PriorityCall = { id: newId, level, waitTime }
        setPriorityList(prev => [newPriority, ...prev.slice(0, 9)])

        setClassification(`AI Highlight: Danger Level: ${level}`)
      }
    }

    runConversation()
    return () => { active = false }
  }, [])

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
                  <button
                    key={level}
                    className="action-btn"
                    onClick={() => setPriorityFilter(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            {/* Column labels */}
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
          </section>
        )}
      </main>
    </div>
  )
}