import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { getShiftsByStatus, markAllPendingAsPaid } from '@/db/database'
import { formatCurrency, formatHours } from '@/utils/format'
import { ShiftCard } from '@/components/ShiftCard'
import { ConfirmDialog } from '@/components/Modal'
import type { Shift, HistoryTab } from '@/types'

export function History() {
  const { refreshKey, showToast, triggerRefresh } = useApp()
  const [tab, setTab] = useState<HistoryTab>('pending')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showMarkPaidConfirm, setShowMarkPaidConfirm] = useState(false)
  const [marking, setMarking] = useState(false)

  const loadShifts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getShiftsByStatus(tab)
      setShifts(data)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    loadShifts()
  }, [loadShifts, refreshKey])

  const totalEarnings = shifts.reduce((sum, s) => sum + s.earnings, 0)
  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0)

  const handleMarkAllPaid = async () => {
    setMarking(true)
    try {
      const count = await markAllPendingAsPaid()
      showToast(`${count} shift${count !== 1 ? 's' : ''} marked as paid ✓`, 'success', 4000)
      triggerRefresh()
      setTab('paid')
    } catch {
      showToast('Failed to mark shifts as paid', 'error')
    } finally {
      setMarking(false)
      setShowMarkPaidConfirm(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>Shift History</h1>
        {tab === 'pending' && shifts.length > 0 && (
          <button
            className="btn btn-success btn-sm"
            onClick={() => setShowMarkPaidConfirm(true)}
          >
            Mark Paid
          </button>
        )}
      </header>

      <div className="page-content">
        <div className="page-padding">
          {/* Tabs */}
          <div className="tabs" style={{ marginTop: 16, marginBottom: 16 }}>
            <button
              className={`tab-btn ${tab === 'pending' ? 'active' : ''}`}
              onClick={() => setTab('pending')}
            >
              ⏳ Pending
            </button>
            <button
              className={`tab-btn ${tab === 'paid' ? 'active' : ''}`}
              onClick={() => setTab('paid')}
            >
              ✓ Paid
            </button>
          </div>

          {/* Summary row */}
          {!loading && shifts.length > 0 && (
            <div className="card" style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: tab === 'pending' ? 'var(--warning-dim)' : 'var(--success-dim)',
              borderColor: tab === 'pending' ? 'var(--warning)' : 'var(--success)',
            }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 2 }}>
                  {shifts.length} shift{shifts.length !== 1 ? 's' : ''} · {formatHours(totalHours)}
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: tab === 'pending' ? 'var(--warning)' : 'var(--success)',
                  fontFamily: 'DM Mono, monospace',
                }}>
                  {formatCurrency(totalEarnings)}
                </div>
              </div>
              {tab === 'pending' && (
                <div style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 500 }}>
                  Unpaid
                </div>
              )}
              {tab === 'paid' && (
                <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
                  Received
                </div>
              )}
            </div>
          )}

          {/* Mark all paid banner */}
          {tab === 'pending' && !loading && shifts.length > 0 && (
            <button
              className="btn btn-block"
              style={{
                marginBottom: 16,
                background: 'var(--success)',
                color: '#fff',
                borderRadius: 'var(--radius-lg)',
                padding: '14px',
                fontSize: 15,
                fontWeight: 600,
                boxShadow: '0 4px 16px rgba(34,209,122,0.3)',
              }}
              onClick={() => setShowMarkPaidConfirm(true)}
            >
              ✓ Mark All Pending Shifts As Paid
            </button>
          )}

          {/* Shift list */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <span className="loading-spinner" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{tab === 'pending' ? '🎉' : '📋'}</div>
              <div className="empty-state-title">
                {tab === 'pending' ? 'No pending shifts' : 'No paid shifts yet'}
              </div>
              <div className="empty-state-desc">
                {tab === 'pending'
                  ? 'All your shifts are paid! Log new shifts to track upcoming earnings.'
                  : 'Shifts you mark as paid will appear here for your records.'}
              </div>
            </div>
          ) : (
            <div className="flex-col gap-3">
              {shifts.map(shift => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onMutated={() => {
                    loadShifts()
                    triggerRefresh()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showMarkPaidConfirm}
        onClose={() => setShowMarkPaidConfirm(false)}
        onConfirm={handleMarkAllPaid}
        title="Mark All As Paid?"
        message={`Are you sure you received payment for all ${shifts.length} pending shift${shifts.length !== 1 ? 's' : ''} totalling ${formatCurrency(totalEarnings)}?`}
        confirmLabel="Yes, Mark As Paid"
        confirmVariant="success"
        loading={marking}
      />
    </div>
  )
}
