import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { formatDuration, formatCurrency, msToHours } from '@/utils/format'

interface StopwatchEntryProps {
  onShiftStarted: () => void
}

export function StopwatchEntry({ onShiftStarted }: StopwatchEntryProps) {
  const { settings, activeShift, startShift, pauseShift, resumeShift, endShift } = useApp()
  const [rate, setRate] = useState(settings.hourlyRate.toString())
  const [notes, setNotes] = useState('')
  const [elapsed, setElapsed] = useState(0)

  // Update elapsed time every second when shift is active and not paused
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
      const id = setInterval(update, 1000)
      return () => clearInterval(id)
    }
  }, [activeShift])

  // Pre-fill notes from active shift
  useEffect(() => {
    if (activeShift) {
      setNotes(activeShift.notes)
      setRate(activeShift.hourlyRate.toString())
    }
  }, [activeShift])

  const rateNum = parseFloat(rate) || settings.hourlyRate
  const earnings = msToHours(elapsed) * (activeShift?.hourlyRate ?? rateNum)
  const isPaused = !!activeShift?.pausedAt

  const handleStart = async () => {
    const r = parseFloat(rate)
    if (isNaN(r) || r <= 0) return
    await startShift(r, notes.trim())
    onShiftStarted()
  }

  if (activeShift) {
    // Show live active shift controls
    return (
      <div className="flex-col gap-4">
        <div className="card" style={{
          textAlign: 'center',
          background: isPaused
            ? 'linear-gradient(135deg, rgba(255,181,71,0.08), rgba(255,181,71,0.02))'
            : 'linear-gradient(135deg, rgba(124,92,252,0.12), rgba(124,92,252,0.02))',
          borderColor: isPaused ? 'var(--warning)' : 'var(--primary)',
          padding: '32px 24px',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            background: isPaused ? 'var(--warning-dim)' : 'var(--primary-glow)',
            border: `1px solid ${isPaused ? 'var(--warning)' : 'var(--primary)'}`,
            borderRadius: 'var(--radius-full)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase' as const,
            color: isPaused ? 'var(--warning)' : 'var(--primary)',
            marginBottom: 20,
          }}>
            {isPaused ? '⏸ Paused' : '▶ Running'}
          </div>

          <div className="stopwatch-time">{formatDuration(elapsed)}</div>
          <div className="stopwatch-earnings" style={{ marginTop: 12 }}>
            {formatCurrency(earnings)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
            ${activeShift.hourlyRate.toFixed(2)}/hr
            {activeShift.notes ? ` · ${activeShift.notes}` : ''}
          </div>
        </div>

        <div className="stopwatch-controls">
          <button
            className={`btn ${isPaused ? 'btn-success' : 'btn-surface'}`}
            style={{ flex: 1 }}
            onClick={isPaused ? resumeShift : pauseShift}
          >
            {isPaused ? '▶  Resume' : '⏸  Pause'}
          </button>
          <button
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={endShift}
          >
            ⏹  End Shift
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>
          Your shift is saved automatically — closing this app won't lose it.
        </div>
      </div>
    )
  }

  // No active shift — show start form
  return (
    <div className="flex-col gap-4">
      <div className="card" style={{ padding: 20 }}>
        <div className="flex-col gap-4">
          <div style={{ textAlign: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>⏱</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
              Start a live shift timer. Your hours will be tracked in real time.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Hourly Rate (AUD)</label>
            <input
              type="number"
              className="form-input"
              value={rate}
              onChange={e => setRate(e.target.value)}
              step="0.50"
              min="0"
              placeholder="e.g. 25.00"
              inputMode="decimal"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Restaurant shift, Weekend work"
              maxLength={100}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{
        padding: '12px 16px',
        background: 'var(--primary-glow-lg)',
        borderColor: 'var(--primary)',
        fontSize: 13,
        color: 'var(--text-2)',
        lineHeight: 1.5,
      }}>
        <strong style={{ color: 'var(--primary)' }}>🔒 Shift Persistence</strong><br />
        Your active shift is saved locally. It will survive browser closes, refreshes, and device sleep.
      </div>

      <button
        className="btn btn-primary btn-block btn-lg"
        onClick={handleStart}
        disabled={isNaN(parseFloat(rate)) || parseFloat(rate) <= 0}
      >
        ▶  Start Shift
      </button>
    </div>
  )
}
