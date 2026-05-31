import { useState } from 'react'
import type { Shift } from '@/types'
import { formatDate, formatHours, formatCurrency, formatTime12h } from '@/utils/format'
import { deleteShift, updateShift } from '@/db/database'
import { useApp } from '@/context/AppContext'
import { ConfirmDialog } from './Modal'

interface ShiftCardProps {
  shift: Shift
  onMutated: () => void
}

export function ShiftCard({ shift, onMutated }: ShiftCardProps) {
  const { showToast } = useApp()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isPaid = shift.status === 'paid'

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteShift(shift.id)
      showToast('Shift deleted', 'success')
      onMutated()
    } catch {
      showToast('Failed to delete shift', 'error')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const timeRangeStr = shift.startTime && shift.endTime
    ? `${formatTime12h(shift.startTime)} – ${formatTime12h(shift.endTime)}${shift.breakMinutes > 0 ? ` (${shift.breakMinutes}m break)` : ''}`
    : null

  return (
    <>
      <div className="shift-card" onClick={() => setShowDetails(d => !d)}>
        <div className="shift-card-header">
          <div>
            <div className="shift-date">{formatDate(shift.date)}</div>
            {timeRangeStr && (
              <div className="shift-time-range">{timeRangeStr}</div>
            )}
          </div>
          <div className={`shift-earnings ${isPaid ? 'paid' : ''}`}>
            {formatCurrency(shift.earnings)}
          </div>
        </div>

        <div className="shift-meta">
          <span className="chip">
            <ClockIcon />
            {formatHours(shift.hoursWorked)}
          </span>
          <span className="chip">
            ${shift.hourlyRate.toFixed(2)}/hr
          </span>
          <span className={`chip ${isPaid ? 'chip-paid' : 'chip-pending'}`}>
            {isPaid ? '✓ Paid' : '⏳ Pending'}
          </span>
          {shift.entryMethod === 'stopwatch' && (
            <span className="chip">⏱ Stopwatch</span>
          )}
        </div>

        {shift.notes ? (
          <div className="shift-note">{shift.notes}</div>
        ) : null}

        {showDetails && (
          <div
            className="shift-actions"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="btn btn-surface btn-sm"
              style={{ flex: 1 }}
              onClick={() => setShowEditModal(true)}
            >
              <EditIcon />
              Edit
            </button>
            <button
              className="btn btn-sm"
              style={{ flex: 1, background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <DeleteIcon />
              Delete
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Shift?"
        message={`Delete this shift on ${formatDate(shift.date)} (${formatCurrency(shift.earnings)})? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      <EditShiftModal
        open={showEditModal}
        shift={shift}
        onClose={() => setShowEditModal(false)}
        onSaved={() => {
          setShowEditModal(false)
          onMutated()
        }}
      />
    </>
  )
}

// ---- Inline EditShiftModal ----
function EditShiftModal({
  open,
  shift,
  onClose,
  onSaved,
}: {
  open: boolean
  shift: Shift
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useApp()
  const [date, setDate] = useState(shift.date)
  const [hours, setHours] = useState(shift.hoursWorked.toString())
  const [rate, setRate] = useState(shift.hourlyRate.toString())
  const [notes, setNotes] = useState(shift.notes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    const h = parseFloat(hours)
    const r = parseFloat(rate)

    if (!date) { setError('Date is required'); return }
    if (isNaN(h) || h <= 0 || h > 24) { setError('Enter valid hours (0–24)'); return }
    if (isNaN(r) || r <= 0) { setError('Enter a valid hourly rate'); return }

    setError('')
    setSaving(true)
    try {
      const updated: Shift = {
        ...shift,
        date,
        hoursWorked: Math.round(h * 100) / 100,
        hourlyRate: Math.round(r * 100) / 100,
        earnings: Math.round(h * r * 100) / 100,
        notes: notes.trim(),
      }
      await updateShift(updated)
      showToast('Shift updated', 'success')
      onSaved()
    } catch {
      showToast('Failed to update shift', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop centered"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-centered" style={{ maxWidth: 360 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Edit Shift</h2>

        <div className="flex-col gap-3">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
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
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Weekend shift"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-surface btn-sm" style={{ flex: 1 }} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
              {saving ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
  </svg>
)

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
  </svg>
)
