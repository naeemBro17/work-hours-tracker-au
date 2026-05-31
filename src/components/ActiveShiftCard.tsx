import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { formatDuration, formatCurrency, msToHours } from '@/utils/format'
import { ConfirmDialog } from './Modal'

export function ActiveShiftCard() {
  const { activeShift, pauseShift, resumeShift, endShift } = useApp()
  const [elapsed, setElapsed] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    if (!activeShift) return

    function update() {
      if (!activeShift) return
      const now = Date.now()
      const end = activeShift.pausedAt ?? now
      const totalMs = end - activeShift.startTimestamp - activeShift.totalPausedMs
      setElapsed(Math.max(0, totalMs))
    }

    update()
    if (!activeShift.pausedAt) {
      const interval = setInterval(update, 1000)
      return () => clearInterval(interval)
    }
  }, [activeShift])

  if (!activeShift) return null

  const isPaused = !!activeShift.pausedAt
  const earnings = msToHours(elapsed) * activeShift.hourlyRate

  const handleEnd = async () => {
    setEnding(true)
    try {
      await endShift()
    } finally {
      setEnding(false)
      setShowEndConfirm(false)
    }
  }

  const startDate = new Date(activeShift.startTimestamp)
  const startTimeStr = startDate.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <>
      <div className="active-shift-card">
        <div className="active-badge">
          {isPaused ? (
            <>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} />
              PAUSED
            </>
          ) : (
            <>
              <span className="pulse-dot" />
              ACTIVE SHIFT
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div className="shift-timer">{formatDuration(elapsed)}</div>
            <div className="shift-earnings-live">{formatCurrency(earnings)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 2 }}>Started</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{startTimeStr}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              ${activeShift.hourlyRate.toFixed(2)}/hr
            </div>
          </div>
        </div>

        {activeShift.notes ? (
          <div style={{
            fontSize: 13,
            color: 'var(--text-2)',
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
            marginTop: 4,
            borderLeft: '2px solid var(--primary)',
          }}>
            {activeShift.notes}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            className={`btn btn-sm ${isPaused ? 'btn-success' : 'btn-surface'}`}
            style={{ flex: 1 }}
            onClick={isPaused ? resumeShift : pauseShift}
          >
            {isPaused ? (
              <>
                <ResumeIcon />
                Resume
              </>
            ) : (
              <>
                <PauseIcon />
                Pause
              </>
            )}
          </button>

          <button
            className="btn btn-danger btn-sm"
            style={{ flex: 1 }}
            onClick={() => setShowEndConfirm(true)}
          >
            <StopIcon />
            End Shift
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEnd}
        title="End Shift?"
        message={`You've worked ${formatDuration(elapsed)} and earned ${formatCurrency(earnings)}. End this shift now?`}
        confirmLabel="End Shift"
        confirmVariant="danger"
        loading={ending}
      />
    </>
  )
}

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
)

const ResumeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21"/>
  </svg>
)

const StopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
)
