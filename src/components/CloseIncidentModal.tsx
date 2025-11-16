import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

export type CloseIncidentModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

const STATUSES: string[] = [
  'reconciling telemetry…',
  'validating windows…',
  'checking SLOs…',
  'confirming DB health…',
  'scanning error budgets…',
]

const TRANSITION_MS = 1100

export default function CloseIncidentModal({ isOpen, onClose, onConfirm }: CloseIncidentModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const previouslyFocusedElRef = useRef<HTMLElement | null>(null)
  const [statusIdx, setStatusIdx] = useState(0)
  const [settled, setSettled] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) return
    // run once through the list, then settle
    setStatusIdx(0)
    setSettled(false)
    let i = 0
    const tick = () => {
      if (i < STATUSES.length - 1) {
        i += 1
        setStatusIdx(i)
        timerRef.current = window.setTimeout(tick, TRANSITION_MS) as any
      } else {
        // settle shortly after last item
        timerRef.current = window.setTimeout(() => setSettled(true), 800) as any
      }
    }
    timerRef.current = window.setTimeout(tick, TRANSITION_MS) as any
    return () => { if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null } }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    previouslyFocusedElRef.current = document.activeElement as HTMLElement | null
    const id = window.requestAnimationFrame(() => {
      if (closeBtnRef.current) closeBtnRef.current.focus()
      else if (dialogRef.current) dialogRef.current.focus()
    })
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = getFocusable(dialogRef.current)
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }
        const active = document.activeElement as HTMLElement | null
        const currentIndex = active ? focusable.indexOf(active) : -1
        let nextIndex = currentIndex
        if (e.shiftKey) nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
        else nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1
        e.preventDefault()
        focusable[nextIndex]?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.cancelAnimationFrame(id)
      document.removeEventListener('keydown', onKeyDown, true)
      if (previouslyFocusedElRef.current && document.contains(previouslyFocusedElRef.current)) {
        previouslyFocusedElRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  const titleId = useMemo(() => `close-incident-title-${uniqueId()}`, [])
  const bodyId = useMemo(() => `close-incident-body-${uniqueId()}`, [])

  if (!isOpen) return null

  return createPortal(
    <div style={styles.overlay}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={styles.panel}
      >
        <div style={styles.header}>
          <div style={styles.headerTitleRow}>
            <h2 id={titleId} style={styles.title}>Close the incident</h2>
          </div>
          <div style={styles.headerDivider} />
        </div>

        <div id={bodyId} style={styles.body}>
          <p style={styles.bodyText}>
            Telemetry and performance checks indicate stability across key metrics. There are no active alerts or anomalies, and all changes have completed validation. <strong>It is now safe to close the incident.</strong>
          </p>
        </div>

        <div style={styles.footer}>
          <div style={styles.rovoLine} aria-live="polite" aria-atomic="true">
            <img src="/assets/rovo-icon.svg" alt="" width={18} height={18} style={styles.rovoIcon} />
            <span style={styles.rovoLabel}>Rovo</span>
            <span style={styles.cyclerContainer}>
              {settled ? (
                <span style={{ ...styles.cyclerText, fontWeight: 700 }}>has verified checks.</span>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={statusIdx}
                    style={styles.cyclerText}
                    initial={{ opacity: 0, y: '0.8em' }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: '-0.8em' }}
                    transition={{ duration: 0.22, ease: [0.2, 0.6, 0.2, 1] }}
                  >
                    {STATUSES[statusIdx]}
                  </motion.span>
                </AnimatePresence>
              )}
            </span>
          </div>

          <div style={styles.ctaRow}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="button" onClick={onConfirm} style={styles.primaryBtn}>Close and draft a PIR</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  const selectors = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ]
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selectors.join(',')))
  return nodes.filter((el) => el.offsetParent !== null || el === document.activeElement)
}

function uniqueId(): string {
  return Math.random().toString(36).slice(2)
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 2147483647,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  panel: {
    width: 600,
    maxWidth: '96%',
    background: '#fff',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: 12,
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    color: 'var(--text, #111827)',
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '12px 16px 8px 16px',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-start',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.3,
    flex: 1,
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'var(--border, #e5e7eb)',
    marginTop: 8,
    marginLeft: -16,
    marginRight: -16,
  },
  body: { padding: '8px 16px 10px' },
  bodyText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text, #111827)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 16px',
    borderTop: '1px solid var(--border, #e5e7eb)',
  },
  rovoLine: {
    display: 'inline-flex',
    alignItems: 'baseline',
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    maxWidth: '70%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  rovoIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
    flex: '0 0 auto',
    transform: 'translateZ(0)',
    position: 'relative',
    top: '0.2em',
  },
  rovoLabel: { fontWeight: 700, marginRight: 4, flex: '0 0 auto', lineHeight: 1.25, position: 'relative', top: '-2px' },
  cyclerContainer: {
    display: 'inline-block',
    height: '1.25em',
    overflow: 'hidden',
    verticalAlign: 'baseline',
    willChange: 'transform',
    position: 'relative',
    top: '-2px',
  },
  cyclerText: { display: 'inline-block', whiteSpace: 'nowrap', lineHeight: 1.25 },
  ctaRow: { display: 'inline-flex', alignItems: 'center', gap: 8, flex: '0 0 auto' },
  cancelBtn: {
    height: 36,
    padding: '8px 16px',
    borderRadius: 6,
    border: '1px solid var(--border, #e5e7eb)',
    background: 'none',
    color: 'var(--text, #111827)',
    cursor: 'pointer',
    fontSize: 'var(--fs-base, 14px)',
    fontWeight: 600,
  },
  primaryBtn: {
    height: 36,
    padding: '8px 12px',
    minWidth: 220,
    borderRadius: 6,
    border: '1px solid var(--primary, #2563eb)',
    background: 'var(--primary, #2563eb)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 'var(--fs-base, 14px)',
    fontWeight: 600,
  },
}


