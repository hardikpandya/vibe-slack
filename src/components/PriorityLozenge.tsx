import React from 'react'

export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3'

const TOKENS: Record<PriorityLevel, { bg: string; color: string }> = {
  P0: { bg: '#DE350B', color: '#FFFFFF' },
  P1: { bg: '#FFAB00', color: '#FFFFFF' },
  P2: { bg: '#9CA3AF', color: '#FFFFFF' },
  P3: { bg: '#B8BCC8', color: '#FFFFFF' },
}

export default function PriorityLozenge({ priority }: { priority: PriorityLevel }) {
  const token = TOKENS[priority]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        padding: '2px 6px',
        borderRadius: 'var(--radius)',
        background: token.bg,
        color: token.color,
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
      }}
    >
      {priority}
    </span>
  )
}



