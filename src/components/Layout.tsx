import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import reactLogo from '../assets/react.svg'
import { useState, useRef, useEffect } from 'react'
import userAvatar from '../assets/user-avatar.svg'
import * as echarts from 'echarts'
import companyData from '../company.json'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname
  const hideNav = path === '/spaces/service'

  type ChatMsg = { id?: string; role: 'user' | 'rovo'; text?: string; html?: string; kind?: 'text' | 'graph' | 'status' | 'rich' | 'steps'; steps?: Array<{ text: string; done: boolean }>; graph?: { title: string; provider: string; id: string; series?: Array<[number, number]> } }
  const [rovoOpen, setRovoOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [feedbackHover, setFeedbackHover] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('navCollapsed')
      return v === '1'
    } catch { return false }
  })
  const [navWidth, setNavWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [navToggleHovered, setNavToggleHovered] = useState(false)
  const [userHovered, setUserHovered] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  // Animations for chat items
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `@keyframes fadeInUp { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }`
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])
  // Bridge function to pin graphs into Investigation page
  ;(window as any).pinGraphToInvestigation = (g: { id: string; title: string; provider: string }) => {
    const ev = new CustomEvent('pin-graph', { detail: g })
    window.dispatchEvent(ev)
  }

  // Internal navigation bridge (for presentation iframes to ask inner app to route client-side)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e?.data as any
      if (!data || typeof data !== 'object') return
      if (data.type === 'internal-nav' && typeof data.to === 'string') {
        try { navigate(data.to) } catch {}
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [navigate])

  const lastSendAtRef = useRef<number>(0)
  const sendingRef = useRef<boolean>(false)
  const hasWelcomedRef = useRef<boolean>(false)
  const turnCounterRef = useRef<number>(0)
  const graphInsertedForTurnRef = useRef<Record<number, boolean>>({})
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  
  // Listen for global investigation start events
  useEffect(() => {
    const onStart = (e: Event) => {
      try { composerRef.current?.focus() } catch {}
    }
    window.addEventListener('start-investigation', onStart)
    return () => window.removeEventListener('start-investigation', onStart)
  }, [])

  // Reset Rovo chat and welcome on Prevention Center entry
  useEffect(() => {
    const onPrev = () => {
      try {
        setChat([])
        hasWelcomedRef.current = true
        const welcomeId = `prev-${Date.now()}`
        setChat((c) => [...c, { id: welcomeId, role: 'rovo', kind: 'rich', html: '' }])
        const segs = [
          { text: 'Hey James,', bold: false }, { br: true }, { br: true },
          { text: 'This ', bold: false }, { text: 'CHG-189', bold: true }, { text: ' needs a quick review from you. It\'s a risky DB index change near peak window, lock contention possible.', bold: false }, { br: true }, { br: true },
          { text: 'Shall we review this quickly?', bold: true },
        ] as Array<{ text?: string; bold?: boolean; br?: boolean }>
        streamRichMessage(welcomeId, segs)
      } catch {}
    }
    window.addEventListener('prevention-enter', onPrev)
    return () => window.removeEventListener('prevention-enter', onPrev)
  }, [])

  // Reset Rovo chat and welcome on Command Center entry
  useEffect(() => {
    const onCmd = () => {
      try {
        setChat([])
        hasWelcomedRef.current = true
        const welcomeId = `cmd-${Date.now()}`
        setChat((c) => [...c, { id: welcomeId, role: 'rovo', kind: 'rich', html: '' }])
        const segs = [
          { text: 'Welcome back to the ', bold: false },
          { text: 'Command Center', bold: true },
          { text: '.', bold: false },
          { br: true },
          { text: 'I’m tracking alerts and incidents across services.', bold: false },
          { br: true },
          { text: 'If anything spikes, I’ll surface it here immediately.', bold: false },
        ] as Array<{ text?: string; bold?: boolean; br?: boolean }>
        streamRichMessage(welcomeId, segs)
      } catch {}
    }
    window.addEventListener('command-center-enter', onCmd)
    return () => window.removeEventListener('command-center-enter', onCmd)
  }, [])

  const runInvestigationStepper = () => {
    const id = `steps-${Date.now()}`
    // Remove any existing stepper blocks before starting a fresh run
    setChat((c) => c.filter(m => m.kind !== 'steps'))
    // 11-step flow
    const steps: Array<{ text: string; done: boolean }> = [
      { text: 'Creating incident shell and assigning on‑call', done: false },
      { text: 'Creating Slack warroom channel', done: false },
      { text: 'Adding stakeholders to Slack channel', done: false },
      { text: 'Preparing Summary: stakeholders and alerts', done: false },
      { text: 'Generating Investigation hypotheses', done: false },
      { text: 'Warming Telemetry: error logs and CPU', done: false },
      { text: 'Warming Telemetry: latency and throughput', done: false },
      { text: 'Drafting Communications templates', done: false },
      { text: 'Building Timeline of changes and events', done: false },
      { text: 'Generating PIR skeleton and sections', done: false },
      { text: 'Final checks and surfacing runbooks', done: false },
    ]
    // Notify any listeners (new, always-visible panel) about step sequence
    try { window.dispatchEvent(new CustomEvent('rovo-steps-init', { detail: { steps: steps.map(s => s.text) } })) } catch {}
    // Still push to local chat state (harmless if panel not rendered)
    setChat((c) => [...c, { id, role: 'rovo', kind: 'steps', steps }])
    // Simulate sequential completion over ~12–15 seconds total
    const rnd = (a: number, b: number) => Math.round(a + Math.random() * (b - a))
    // Durations tuned for ~12–15s total with 11 steps
    const stepDurations = [
      rnd(600, 900),    // create shell
      rnd(700, 1000),   // create slack
      rnd(600, 900),    // add stakeholders
      rnd(900, 1200),   // summary prep
      rnd(1000, 1400),  // hypotheses
      rnd(900, 1200),   // telemetry part 1
      rnd(900, 1200),   // telemetry part 2
      rnd(800, 1100),   // comms drafts
      rnd(1000, 1400),  // timeline
      rnd(800, 1100),   // PIR skeleton
      rnd(900, 1200),   // final checks
    ]
    // Ensure total duration falls within 12–15s by padding the last step if needed
    const total = stepDurations.reduce((a, b) => a + b, 0)
    if (total < 12000) {
      stepDurations[stepDurations.length - 1] += (12000 - total)
    }
    const cumulative: number[] = []
    stepDurations.reduce((acc, d, i) => { const t = acc + d; cumulative[i] = t; return t }, 200) // slight initial delay
    steps.forEach((_, idx) => {
      setTimeout(() => {
        setChat((c) => c.map(m => m.id === id && m.steps ? { ...m, steps: m.steps.map((s, si) => si === idx ? { ...s, done: true } : s) } : m))
        // Emit progress for Investigation page to reveal tabs progressively
        try {
          const fire = (name: string, detail?: any) => window.dispatchEvent(new CustomEvent(name, { detail }))
          // Step done event for external panel
          fire('rovo-step-done', { index: idx })
          // Map step index to tab reveals and summary readiness
          if (idx === 3) fire('rovo-summary-ready')
          if (idx === 4) fire('rovo-reveal-tab', { id: 'investigation' })
          if (idx === 5) fire('rovo-reveal-tab', { id: 'telemetry' })
          if (idx === 7) fire('rovo-reveal-tab', { id: 'comms' })
          if (idx === 8) fire('rovo-reveal-tab', { id: 'timeline' })
          if (idx === 9) fire('rovo-reveal-tab', { id: 'pir' })
        } catch {}
        // After last step, emit rich summary
        if (idx === steps.length - 1) {
          setTimeout(() => {
            // Notify completion
            try { window.dispatchEvent(new CustomEvent('rovo-steps-complete')) } catch {}
            // Remove steps block after a short pause
            setChat((c) => c.filter(m => m.id !== id))
            const apiKey = getOpenAIKey()
            if (apiKey) {
              streamOpenAIReply('Provide an elaborate incident preparation summary for the investigation view just initialized. Include bold highlights and a bulleted list of what was prepared (alerts panel, telemetry charts, timeline). Avoid any undefined or placeholder tokens.', () => {})
            } else {
              const rid = `sum-${Date.now()}`
              setChat((c) => [...c, { id: rid, role: 'rovo', kind: 'rich', html: '' }])
              const segments = [
                { text: 'Summary prepared for the investigation.', bold: true }, { br: true }, { br: true },
                { text: 'What I readied:', bold: true }, { br: true },
                { text: '• Alerts overview with correlated clusters', bold: false }, { br: true },
                { text: '• Key metrics and error rates for impacted services', bold: false }, { br: true },
                { text: '• Timeline of changes and anomaly spikes', bold: false }, { br: true }, { br: true },
                { text: 'Next: ', bold: false }, { text: 'Open runbook suggestions', bold: true },
              ] as Array<{ text?: string; bold?: boolean; br?: boolean }>
              streamRichMessage(rid, segments)
            }
          }, 600)
        }
      }, cumulative[idx])
    })
  }

  // Detect OpenAI API key from environment or localStorage (for local demos only)
  const getOpenAIKey = (): string | null => {
    try {
      const fromEnv = (import.meta as any)?.env?.VITE_OPENAI_API_KEY
      if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim()
    } catch {}
    try {
      const fromLs = localStorage.getItem('openai_api_key')
      if (fromLs && fromLs.trim()) return fromLs.trim()
    } catch {}
    return null
  }

  // Stream an elaborate, formatted HTML reply from OpenAI
  const streamOpenAIReply = async (userText: string, onDone?: () => void) => {
    const apiKey = getOpenAIKey()
    if (!apiKey) throw new Error('Missing OpenAI API key')

    // Insert a fresh rich message we will stream into
    const msgId = `ai-${Date.now()}`
    setChat((c) => [...c, { id: msgId, role: 'rovo', kind: 'rich', html: '' }])

    const controller = new AbortController()
    const sysPrompt = `You are Rovo, an incident investigation copilot. Keep replies elaborate and highly structured.
Output STRICTLY valid HTML only (no markdown). Use:
- <strong> for emphasis
- <ul><li> for bullets
- <a href> for links (use # if no real link)
Avoid outer <html>/<body> tags.`

    const body = {
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userText }
      ],
      temperature: 0.3,
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      throw new Error('OpenAI request failed')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let html = ''
    const step = async (): Promise<void> => {
      const { value, done } = await reader.read()
      if (done) { onDone && onDone(); return }
      const chunk = decoder.decode(value, { stream: true })
      // Parse SSE lines like: data: {"choices":[{"delta":{"content":"..."}}]}
      const lines = chunk.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') { onDone && onDone(); return }
        try {
          const json = JSON.parse(data)
          const delta = json?.choices?.[0]?.delta?.content
          if (typeof delta === 'string') {
            html += delta
            const current = html
            setChat((c) => c.map(m => m.id === msgId ? { ...m, html: current } : m))
          }
        } catch {}
      }
      await step()
    }
    await step()
  }

  useEffect(() => {
    if (rovoOpen && !hasWelcomedRef.current) {
      hasWelcomedRef.current = true
      const welcomeId = `welcome-${Date.now()}`
      setChat((c) => [...c, { id: welcomeId, role: 'rovo', kind: 'rich', html: '' }])
      const onPrevention = path.startsWith('/prevention')
      const onAlerts = (path === '/' || path === '/alerts')
      const segments = onPrevention
        ? [
            { text: 'Hey James, ', bold: false }, { text: 'Rovo here.', bold: true }, { br: true },
            { text: 'Welcome to the Prevention Center.', bold: false }, { br: true },
            { text: 'I’m reviewing change risk across services.', bold: false }, { br: true },
            { text: 'One change needs your attention: ', bold: false }, { text: 'PR‑1893 • payments‑api', bold: true }, { text: '.', bold: false }, { br: true },
            { text: 'Open the review card and start a quick check?', bold: false },
          ]
        : onAlerts
        ? [
            { text: 'Welcome back to the ', bold: false }, { text: 'Command Center', bold: true }, { text: '.', bold: false }, { br: true },
            { text: 'I’m tracking alerts and incidents across services.', bold: false }, { br: true },
            { text: 'If anything spikes, I’ll surface it here immediately.', bold: false },
          ]
        : [
            { text: 'Hi, I’m Rovo.', bold: false }, { br: true },
            { text: 'You’re looking at ', bold: false }, { text: 'Incident‑ITOM‑4412', bold: true }, { text: ' (payments).', bold: false }, { br: true }, { br: true },
            { text: 'I can help with ', bold: false }, { text: 'Dynatrace logs', bold: true }, { text: ', ', bold: false }, { text: 'New Relic metrics', bold: true }, { text: ', ', bold: false }, { text: 'traces', bold: true }, { text: ', comparisons by region, and pinning graphs to ', bold: false }, { text: 'Telemetry', bold: true }, { text: '.', bold: false }, { br: true }, { br: true },
            { text: 'Try: ', bold: false }, { text: 'Show Dynatrace logs for payments‑api (last 3h).', bold: true },
          ]
      streamRichMessage(welcomeId, segments as any)
    }
  }, [rovoOpen, path])

  const sendChat = () => {
    const text = chatInput.trim()
    if (!text) return
    const nowTs = Date.now()
    if (sendingRef.current && nowTs - lastSendAtRef.current < 500) return
    sendingRef.current = true
    lastSendAtRef.current = nowTs
    const turn = ++turnCounterRef.current
    graphInsertedForTurnRef.current[turn] = false
    setChat((c) => [...c, { role: 'user', text, kind: 'text' }])
    setChatInput('')
    // Reset composer height back to auto after sending
    if (composerRef.current) {
      composerRef.current.style.height = 'auto'
    }

    // Reset any stray interim messages from previous turns
    setChat((c) => c.filter(m => !(m.id && (m.id.startsWith('draw-') || m.id.startsWith('status-')))))

    const statusId = `status-${turn}`
    // Build randomized, slower schedule so total >= 7.5s
    const rnd = (a: number, b: number) => Math.round(a + Math.random() * (b - a))
    const d1 = rnd(900, 1600)     // thinking
    const d2 = rnd(1400, 2200)    // connecting
    const d3 = rnd(1500, 2400)    // fetching
    let d4 = rnd(2200, 3200)      // drawing
    let total = d1 + d2 + d3 + d4
    if (total < 7500) d4 += (7500 - total) // ensure min total

    // If OpenAI key present, use real-time streaming; else fall back to local demo flow
    const apiKey = getOpenAIKey()
    if (apiKey) {
      // Show a transient thinking status
      setChat((c) => [...c, { id: statusId, role: 'rovo', kind: 'status', text: 'Rovo is thinking…' }])
      // Slight delay for natural feel, then replace with streamed rich HTML
      setTimeout(() => {
        // Remove status message before streaming
        setChat((c) => c.filter(m => m.id !== statusId))
        streamOpenAIReply(text, () => { sendingRef.current = false })
      }, 400)
      return
    }

    // Fallback: local demo flow
    // 1) Thinking
    setTimeout(() => {
      setChat((c) => [...c, { id: statusId, role: 'rovo', kind: 'status', text: 'Rovo is thinking…' }])
    }, 600)
    // 2) Connecting
    setTimeout(() => {
      setChat((c) => c.map(m => m.id === statusId ? { ...m, text: 'Rovo is connecting to Dynatrace…' } : m))
    }, 600 + d1)
    // 3) Fetching
    setTimeout(() => {
      setChat((c) => c.map(m => m.id === statusId ? { ...m, text: 'Rovo is fetching error logs…' } : m))
    }, 600 + d1 + d2)
    // 4) Replace with streamed summary, then draw and show graph
    setTimeout(() => {
      const graphId = `dt-graph-${Date.now()}`
      const series = buildSeries()
      const summary = summarizeSeries(series)
      const summaryId = `sum-${turn}`
      // Replace status with a fresh streamed summary
      setChat((c) => c.filter(m => m.id !== statusId).concat({ id: summaryId, role: 'rovo', kind: 'text', text: '' }))
      streamTextMessage(summaryId, summary, () => {
        const drawId = `draw-${turn}`
        setChat((c) => [...c, { id: drawId, role: 'rovo', kind: 'status', text: 'Rovo is drawing the graph…' }])
        setTimeout(() => {
          if (graphInsertedForTurnRef.current[turn]) return
          graphInsertedForTurnRef.current[turn] = true
          setChat((c) => c.filter(m => m.id !== drawId).concat({ role: 'rovo', kind: 'graph', graph: { title: 'Dynatrace: payments-api error logs (count)', provider: 'Dynatrace', id: graphId, series } }))
          sendingRef.current = false
        }, d4)
      })
    }, 600 + d1 + d2 + d3)
  }

  const MiniChart = ({ chartId, series }: { chartId: string; series: Array<[number, number]> }) => {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
      if (!ref.current) return
      const inst = echarts.init(ref.current)
      const THIRTY_MIN_MS = 30 * 60 * 1000
      const floorTo30 = (t: number) => Math.floor(t / THIRTY_MIN_MS) * THIRTY_MIN_MS
      const ceilTo30 = (t: number) => Math.ceil(t / THIRTY_MIN_MS) * THIRTY_MIN_MS

      const minTs = series.length ? series[0][0] : Date.now() - 3 * THIRTY_MIN_MS
      const maxTs = series.length ? series[series.length - 1][0] : Date.now()

      inst.setOption({
        animationDuration: 800,
        grid: { left: 28, right: 10, top: 10, bottom: 24 },
        xAxis: { 
          type: 'time', 
          min: floorTo30(minTs),
          max: ceilTo30(maxTs),
          minInterval: THIRTY_MIN_MS,
          maxInterval: THIRTY_MIN_MS,
          axisLine: { lineStyle: { color: '#e5e7eb' } }, 
          axisLabel: { 
            color: '#6b7280', 
            hideOverlap: true,
            formatter: (v: any) => {
              const d = new Date(v)
              const m = d.getMinutes()
              // Show only on 30m boundaries to avoid crowding in narrow chat
              if (m % 30 !== 0) return ''
              return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            }
          }, 
          axisTick: { show: false } 
        },
        yAxis: { type: 'value', axisLine: { lineStyle: { color: '#e5e7eb' } }, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#6b7280' } },
        series: [{ type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.06, color: '#2563eb' }, lineStyle: { color: '#2563eb', width: 2 }, data: series }],
      })
      const onResize = () => inst.resize()
      window.addEventListener('resize', onResize)
      return () => { window.removeEventListener('resize', onResize); inst.dispose() }
    }, [chartId, series])
    return <div ref={ref} style={{ height: 200, width: '100%' }} />
  }

  const buildSeries = (): Array<[number, number]> => {
    const now = Date.now()
    const points: Array<[number, number]> = []
    let base = 10
    for (let i = 36; i >= 0; i--) {
      base += (Math.random() - 0.5) * 2
      base = Math.max(3, Math.min(30, base))
      points.push([now - i * 5 * 60 * 1000, Math.round(base)])
    }
    return points
  }

  const summarizeSeries = (series: Array<[number, number]>): string => {
    if (!series.length) return 'Pulled latest error logs from Dynatrace.'
    const ys = series.map(([, y]) => y)
    const xs = series.map(([x]) => x)
    const maxVal = Math.max(...ys)
    const maxIdx = ys.indexOf(maxVal)
    const maxAt = new Date(xs[maxIdx]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const last6 = ys.slice(-6)
    const prev6 = ys.slice(-12, -6)
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)
    const d = avg(last6) - avg(prev6)
    const trend = d > 0.6 ? 'rising' : d < -0.6 ? 'trending down' : 'holding steady'
    return `Pulled 3h error logs for payments-api from Dynatrace. Peak ${maxVal} at ${maxAt}; last 30 min ${trend}.`
  }

  const streamTextMessage = (id: string, full: string, onDone?: () => void) => {
    let idx = 0
    const tick = () => {
      // Stream 2-3 chars per tick with a natural cadence, slightly slower to reduce flicker
      idx = Math.min(full.length, idx + 2 + Math.floor(Math.random() * 2))
      setChat((c) => c.map(m => m.id === id ? { ...m, text: full.slice(0, idx) } : m))
      if (idx < full.length) {
        window.setTimeout(tick, 36 + Math.round(Math.random() * 36))
      } else {
        onDone && onDone()
      }
    }
    tick()
  }

  const streamRichMessage = (id: string, segments: Array<{ text?: string; bold?: boolean; br?: boolean }>, onDone?: () => void) => {
    let html = ''
    let si = 0
    const step = () => {
      if (si >= segments.length) { onDone && onDone(); return }
      const seg = segments[si]
      if (seg.br) {
        html += '<br/>'
        si++
        setChat((c) => c.map(m => m.id === id ? { ...m, html } : m))
        window.setTimeout(step, 120)
        return
      }
      const text = seg.text || ''
      let idx = 0
      const tick = () => {
        const chunk = text.slice(idx, idx + 2 + Math.floor(Math.random() * 2))
        idx += chunk.length
        html += seg.bold ? `<strong>${chunk}</strong>` : chunk
        setChat((c) => c.map(m => m.id === id ? { ...m, html } : m))
        if (idx < text.length) {
          window.setTimeout(tick, 24 + Math.round(Math.random() * 40))
        } else {
          si++
          window.setTimeout(step, 120)
        }
      }
      tick()
    }
    step()
  }

  // Drag resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = Math.max(200, Math.min(500, e.clientX))
      setNavWidth(newWidth)
      document.documentElement.style.setProperty('--nav-width', `${newWidth}px`)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const handleResizeStart = () => {
    setIsResizing(true)
  }


  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 10px',
    borderRadius: '4px',
    textDecoration: 'none',
    color: active ? 'var(--primary)' : 'var(--text-900)',
    background: active ? 'var(--primary-weak)' : 'transparent',
    border: '1px solid transparent',
    fontWeight: 400,
  })

  const NavItem = ({ to, label, level = 0, active, iconSrc, tint, onClick }: { to: string; label: string; level?: number; active: boolean; iconSrc?: string; tint?: 'spacesGrey'; onClick?: () => void }) => {
    const [hover, setHover] = useState(false)
    const thickness = 3
    const base = navItemStyle(active)
    const style: React.CSSProperties = {
      ...base,
      // Slight internal left padding for hover/active highlight
      paddingLeft: navCollapsed ? 10 : 3,
      paddingRight: navCollapsed ? 10 : base.paddingRight,
      marginLeft: level > 0 && !navCollapsed ? 32 : 0,
      background: active ? base.background as string : hover ? 'var(--surface-weak)' : 'transparent',
      border: active ? base.border as string : '1px solid transparent',
      position: 'relative',
      justifyContent: navCollapsed ? 'center' : 'flex-start',
    }
    
    // Hide nested items when collapsed
    if (navCollapsed && level > 0) {
      return null
    }
    
    return (
      <Link to={to} style={style} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}>
        {!navCollapsed && (active || hover) && (
          <span style={{ position: 'absolute', left: -(thickness / 2), top: '25%', width: thickness, height: '50%', background: active ? 'var(--primary)' : '#DFE1E6', borderRadius: thickness / 2 }} />
        )}
        {iconSrc && (
          tint === 'spacesGrey'
            ? (
              <span
                aria-hidden
                style={{
                  width: 24,
                  height: 24,
                  display: 'inline-block',
                  backgroundColor: 'var(--text-600)',
                  WebkitMaskImage: `url(${iconSrc})`,
                  maskImage: `url(${iconSrc})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  flexShrink: 0,
                  opacity: 1,
                }}
              />
            ) : (
              <img 
                src={iconSrc} 
                alt={label} 
                width={24} 
                height={24} 
                style={{ 
                  minWidth: 24, 
                  minHeight: 24, 
                  display: 'block',
                  flexShrink: 0,
                  opacity: 1
                }} 
              />
            )
        )}
        {!navCollapsed && <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0
        }}>{label}</span>}
      </Link>
    )
  }

  const AppItem = ({ to, label, iconSrc }: { to: string; label: string; iconSrc: string }) => {
    const [hover, setHover] = useState(false)
    const thickness = 3
    const style: React.CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 6, 
      padding: navCollapsed ? '4px 10px' : '4px 6px 4px 3px', 
      borderRadius: 4,
      textDecoration: 'none', color: 'var(--text-900)', background: hover ? 'var(--surface-weak)' : 'transparent',
      border: '1px solid transparent', fontWeight: 400,
      position: 'relative',
      justifyContent: navCollapsed ? 'center' : 'flex-start'
    }
    return (
      <Link to={to} style={style} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {!navCollapsed && hover && (
          <span style={{ position: 'absolute', left: -(thickness / 2), top: '25%', width: thickness, height: '50%', background: '#DFE1E6', borderRadius: thickness / 2 }} />
        )}
        <img src={iconSrc} alt="app" width={32} height={32} style={{ minWidth: 32, minHeight: 32, flexShrink: 0 }} onError={(e: any) => { e.currentTarget.src = reactLogo }} />
        {!navCollapsed && (
          <span style={{ 
            flex: 1, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            minWidth: 0
          }}>{label}</span>
        )}
      </Link>
    )
  }

  const IconButton = ({ src, alt, onClick, nudgeY = 0 }: { src: string; alt: string; onClick?: () => void; nudgeY?: number }) => {
    const [hover, setHover] = useState(false)
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hover ? '#F1F2F4' : 'transparent',
          cursor: 'pointer',
        }}
      >
        <img src={src} alt={alt} width={32} height={32} style={{ display: 'block', transform: `translateY(${nudgeY}px)` }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: hideNav ? '1fr' : (navCollapsed ? '72px 1fr' : `${navWidth}px 1fr`), height: '100vh', '--nav-width': hideNav ? '0px' : (navCollapsed ? '72px' : `${navWidth}px`) } as React.CSSProperties}>
      {/* Full height navigation */}
      {!hideNav && (
            <aside ref={navRef} style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
        {/* Top section with logo and collapse button */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: navCollapsed ? 'center' : 'flex-start' }}>
            {/* Company logo - use initials if logo not provided */}
            {companyData.logo ? (
              <img src={companyData.logo} alt={companyData.name} width={32} height={32} style={{ display: 'block' }} />
            ) : (
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: '#0052CC',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'Lato, sans-serif'
              }}>
                {(companyData as any).logoInitials || companyData.name?.substring(0, 2).toUpperCase() || 'CO'}
              </div>
            )}
          </div>
        </div>

        {/* Navigation content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column' }}>
          {/* Main navigation items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-base)', color: 'var(--text)', marginBottom: 16 }}>
            {/* For you: never highlighted; grey icon like others */}
            <NavItem to="/for-you" label="For you" active={false} iconSrc="/assets/navigation/for-you-new.svg" tint="spacesGrey" />
            <NavItem to="/chat" label="Chat" active={path === '/chat'} iconSrc="/assets/chat.svg" tint="spacesGrey" />
            <NavItem to="/search" label="Search" active={path === '/search'} iconSrc="/assets/search.svg" tint="spacesGrey" />
          </nav>

          {/* Monitor section */}
          <div style={{ marginBottom: 16 }}>
            {!navCollapsed && (
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-600)', marginBottom: 6 }}>Monitor</div>
            )}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>
              {/* Prevention center */}
              <NavItem
                to="/prevention"
                label="Prevention center"
                active={path.startsWith('/prevention')}
                iconSrc={path.startsWith('/prevention') ? "/assets/navigation/prevention-center-nav-active.svg" : "/assets/navigation/prevention-center-nav.svg"}
                tint={path.startsWith('/prevention') ? undefined : 'spacesGrey'}
                onClick={() => { try { window.dispatchEvent(new CustomEvent('prevention-enter')) } catch {} }}
              />
              {/* Command center selected when Alerts page is open */}
              <NavItem
                to="/alerts"
                label="Command center"
                active={(path === '/' || path === '/alerts')}
                iconSrc={(path === '/' || path === '/alerts') ? "/assets/navigation/command-center-nav-active.svg" : "/assets/navigation/command-center-nav.svg"}
                tint={(path === '/' || path === '/alerts') ? undefined : 'spacesGrey'}
                onClick={() => { try { window.dispatchEvent(new CustomEvent('command-center-enter')) } catch {} }}
              />
            </nav>
          </div>

          {/* Manage section */}
          <div style={{ marginBottom: 16 }}>
            {!navCollapsed && (
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-600)', marginBottom: 6 }}>Manage</div>
            )}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>
              {/* Alerts (kept non-active for quick access to Command center owning /alerts) */}
              <NavItem
                to="/alerts"
                label="Alerts"
                active={false}
                iconSrc="/assets/navigation/alerts-nav.svg"
                tint="spacesGrey"
              />
              {/* Incidents highlighted on Investigation page */}
              <NavItem
                to="/investigation/HOT-4412"
                label="Incidents"
                active={path.startsWith('/investigation')}
                iconSrc={path.startsWith('/investigation') ? "/assets/navigation/incidents-nav-active.svg" : "/assets/navigation/incidents-nav.svg"}
                tint={path.startsWith('/investigation') ? undefined : 'spacesGrey'}
              />
              {/* Services */}
              <NavItem
                to="/services"
                label="Services"
                active={path.startsWith('/services') || path === '/spaces/service'}
                iconSrc="/assets/navigation/services-nav.svg"
                tint="spacesGrey"
              />
              {/* Changes */}
              <NavItem
                to="/changes"
                label="Changes"
                active={path.startsWith('/changes')}
                iconSrc="/assets/navigation/changes-nav.svg"
                tint={path.startsWith('/changes') ? undefined : 'spacesGrey'}
              />
              {/* Communication */}
              <NavItem
                to="/chat"
                label="Communication"
                active={path.startsWith('/chat')}
                iconSrc="/assets/navigation/comms-nav.svg"
                tint="spacesGrey"
              />
            </nav>
          </div>

          {/* Spaces section (reduced to 2) */}
          {!navCollapsed && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-600)', marginBottom: 6 }}>Spaces</div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>
                <NavItem to="/spaces/people" label="People insights" active={path === '/spaces/people'} iconSrc="/assets/spaces.svg" />
                <NavItem to="/spaces/workforce" label="Workforce planning" active={path === '/spaces/workforce'} iconSrc="/assets/spaces.svg" />
              </nav>
            </div>
          )}

          {/* Chat history section (hidden for now) */}
          {false && !navCollapsed && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-600)', marginBottom: 6 }}>Chat history</div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>
                <NavItem to="/chat/history/1" label="How can I improve employee retention?" active={path === '/chat/history/1'} iconSrc="/assets/chat.svg" />
                <NavItem to="/chat/history/2" label="What's included in our TIP program?" active={path === '/chat/history/2'} iconSrc="/assets/chat.svg" />
              </nav>
            </div>
          )}

          {/* Bottom navigation - pushed to bottom */}
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '14px', color: 'var(--text)' }}>
              <AppItem to="/apps" label="All apps" iconSrc="/assets/app-switcher.svg" />
              <AppItem to="/settings" label="Settings" iconSrc="/assets/settings.svg" />
            </nav>
          </div>
        </div>
        
        {/* Resize handle */}
        {!navCollapsed && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 4,
              height: '100%',
              cursor: 'col-resize',
              background: 'transparent',
              zIndex: 10
            }}
            onMouseDown={handleResizeStart}
          />
        )}
      </aside>
      )}

      {/* Main content area */}
      <main style={{ padding: hideNav ? 0 : '0 32px', overflow: 'auto', position: 'relative', background: '#fff' }}>
        {/* Sticky header bar: nav toggle + Ask Rovo + avatar */}
        <div style={{ 
          position: 'sticky', 
          top: 6, 
          zIndex: 10020, 
          background: '#fff',
          // Full-bleed background to cover main padding (left/right) and top padding
          marginLeft: hideNav ? 0 : -32,
          marginRight: hideNav ? 0 : -32,
          paddingLeft: hideNav ? 0 : 32,
          paddingRight: hideNav ? 0 : 32,
          marginTop: 0,
          paddingTop: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0 0 0' }}>
            <div>
              {!hideNav && (
                <button 
                  onClick={() => { const next = !navCollapsed; setNavCollapsed(next); try { localStorage.setItem('navCollapsed', next ? '1' : '0') } catch {} }} 
                  style={{ 
                    width: 32, 
                    height: 32, 
                    border: 'none', 
                    background: navToggleHovered ? 'var(--surface)' : 'transparent', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4
                  }}
                  onMouseEnter={() => setNavToggleHovered(true)}
                  onMouseLeave={() => setNavToggleHovered(false)}
                >
                  <img src="/assets/nav-toggle.svg" alt="Toggle navigation" width={40} height={40} style={{ display: 'block', minWidth: 40, minHeight: 40, transform: navCollapsed ? 'scaleX(-1)' : 'scaleX(1)' }} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Ask Rovo button hidden while chat is always visible in Arc side panel */}

              <button 
                style={{ 
                  width: 32, height: 32, border: 'none', 
                  background: userHovered ? 'var(--surface)' : 'transparent', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4
                }}
                onMouseEnter={() => setUserHovered(true)}
                onMouseLeave={() => setUserHovered(false)}
              >
                <img src="/assets/faces/face-6.jpg" alt="James McGill" width={32} height={32} style={{ display: 'block', minWidth: 32, minHeight: 32, borderRadius: '50%', objectFit: 'cover' }} />
              </button>
            </div>
          </div>
        </div>

        <Outlet />
      </main>

      {/* Split-pane chat is owned elsewhere; no local chat UI here. */}
    </div>
  )
}



