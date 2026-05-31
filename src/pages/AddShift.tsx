import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { createShift } from '@/db/database'
import { getTodayString, calculateHoursFromTimeRange } from '@/utils/format'
import type { AddShiftMethod } from '@/types'
import { StopwatchEntry } from '@/components/StopwatchEntry'

export function AddShift() {
  const [method, setMethod] = useState<AddShiftMethod>('manual')
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>Log Hours</h1>
      </header>

      <div className="page-content">
        <div className="page-padding">
          {/* Method selector */}
          <div className="method-tabs" style={{ marginTop: 16, marginBottom: 20 }}>
            <button
              className={`method-tab ${method === 'manual' ? 'active' : ''}`}
              onClick={() => setMethod('manual')}
            >
              <span className="method-tab-icon">✏️</span>
              Manual Entry
            </button>
            <button
              className={`method-tab ${method === 'timeRange' ? 'active' : ''}`}
              onClick={() => setMethod('timeRange')}
            >
              <span className="method-tab-icon">🕐</span>
              Start / End
            </button>
            <button
              className={`method-tab ${method === 'stopwatch' ? 'active' : ''}`}
              onClick={() => setMethod('stopwatch')}
            >
              <span className="method-tab-icon">⏱</span>
              Stopwatch
            </button>
          </div>

          {method === 'manual' && <ManualEntry onSaved={() => navigate('/')} />}
          {method === 'timeRange' && <TimeRangeEntry onSaved={() => navigate('/')} />}
          {method === 'stopwatch' && (
            <StopwatchEntry
              onShiftStarted={() => navigate('/')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MANUAL ENTRY
// ============================================================

function ManualEntry({ onSaved }: { onSaved: () => void }) {
  const { settings, showToast, triggerRefresh } = useApp()
  const [date, setDate] = useState(getTodayString())
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState(settings.hourlyRate.toString())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const hoursNum = parseFloat(hours)
  const rateNum = parseFloat(rate)
  const earnings = !isNaN(hoursNum) && !isNaN(rateNum) ? hoursNum * rateNum : 0

  const handleSave = async () => {
    if (!date) { setError('Please select a date'); return }
    if (isNaN(hoursNum) || hoursNum <= 0) { setError('Enter valid hours (e.g. 7.5)'); return }
    if (hoursNum > 24) { setError('Hours cannot exceed 24'); return }
    if (isNaN(rateNum) || rateNum <= 0) { setError('Enter a valid hourly rate'); return }

    setError('')
    setSaving(true)
    try {
      await createShift({
        date,
        hoursWorked: Math.round(hoursNum * 100) / 100,
        breakMinutes: 0,
        hourlyRate: Math.round(rateNum * 100) / 100,
        earnings: Math.round(hoursNum * rateNum * 100) / 100,
        notes: notes.trim(),
        status: 'pending',
        entryMethod: 'manual',
      })
      showToast(`Shift saved — $${(hoursNum * rateNum).toFixed(2)} earned`, 'success')
      triggerRefresh()
      onSaved()
    } catch {
      showToast('Failed to save shift', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-col gap-4">
      <div className="card" style={{ padding: 20 }}>
        <div className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} max={getTodayString()} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Hours Worked</label>
            <input
              type="number"
              className="form-input"
              value={hours}
              onChange={e => setHours(e.target.value)}
              step="0.25"
              min="0.25"
              max="24"
              placeholder="e.g. 7.5"
              inputMode="decimal"
            />
            <span className="form-hint">Decimals OK (e.g. 7.5 = 7 hours 30 minutes)</span>
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
            <span className="form-hint">Rate is saved with this shift — changes won't affect it later</span>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Restaurant shift, Night shift, Public Holiday"
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {/* Earnings preview */}
      {earnings > 0 && (
        <div className="card" style={{ background: 'var(--success-dim)', borderColor: 'var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--success)', fontWeight: 500 }}>Estimated Earnings</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)', fontFamily: 'DM Mono, monospace' }}>
              ${earnings.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}

      <button
        className="btn btn-primary btn-block btn-lg"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <span className="loading-spinner" style={{ width: 20, height: 20 }} /> : '💾  Save Shift'}
      </button>
    </div>
  )
}

// ============================================================
// TIME RANGE ENTRY
// ============================================================

function TimeRangeEntry({ onSaved }: { onSaved: () => void }) {
  const { settings, showToast, triggerRefresh } = useApp()
  const [date, setDate] = useState(getTodayString())
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMins, setBreakMins] = useState('0')
  const [rate, setRate] = useState(settings.hourlyRate.toString())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const breakNum = parseInt(breakMins) || 0
  const rateNum = parseFloat(rate)
  const hoursWorked = startTime && endTime
    ? calculateHoursFromTimeRange(startTime, endTime, breakNum)
    : null
  const earnings = hoursWorked && !isNaN(rateNum) ? hoursWorked * rateNum : 0

  const handleSave = async () => {
    if (!date) { setError('Please select a date'); return }
    if (!startTime) { setError('Enter a start time'); return }
    if (!endTime) { setError('Enter an end time'); return }
    if (hoursWorked === null || hoursWorked <= 0) {
      setError('End time must be after start time, and break cannot exceed shift length')
      return
    }
    if (hoursWorked > 24) { setError('Shift duration cannot exceed 24 hours'); return }
    if (isNaN(rateNum) || rateNum <= 0) { setError('Enter a valid hourly rate'); return }

    setError('')
    setSaving(true)
    try {
      await createShift({
        date,
        startTime,
        endTime,
        breakMinutes: breakNum,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        hourlyRate: Math.round(rateNum * 100) / 100,
        earnings: Math.round(hoursWorked * rateNum * 100) / 100,
        notes: notes.trim(),
        status: 'pending',
        entryMethod: 'timeRange',
      })
      showToast(`Shift saved — $${(hoursWorked * rateNum).toFixed(2)} earned`, 'success')
      triggerRefresh()
      onSaved()
    } catch {
      showToast('Failed to save shift', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-col gap-4">
      <div className="card" style={{ padding: 20 }}>
        <div className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} max={getTodayString()} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Break Time (minutes)</label>
            <input
              type="number"
              className="form-input"
              value={breakMins}
              onChange={e => setBreakMins(e.target.value)}
              min="0"
              max="480"
              step="5"
              placeholder="0"
              inputMode="numeric"
            />
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
              placeholder="e.g. Night shift, Cash payment"
              maxLength={100}
            />
          </div>
        </div>
      </div>

      {/* Calculated preview */}
      {hoursWorked && hoursWorked > 0 && (
        <div className="card" style={{ background: 'var(--success-dim)', borderColor: 'var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calculated</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Hours worked</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>
                {Math.floor(hoursWorked)}h {Math.round((hoursWorked % 1) * 60)}m
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Earnings</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)', fontFamily: 'DM Mono, monospace' }}>
                ${earnings.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}

      <button
        className="btn btn-primary btn-block btn-lg"
        onClick={handleSave}
        disabled={saving || !hoursWorked || hoursWorked <= 0}
      >
        {saving ? <span className="loading-spinner" style={{ width: 20, height: 20 }} /> : '💾  Save Shift'}
      </button>
    </div>
  )
}
