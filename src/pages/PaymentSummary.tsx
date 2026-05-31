import { useState, useEffect } from 'react'
import { getAllShifts, getShiftsByStatus } from '@/db/database'
import { formatCurrency, formatHours, formatDate, formatTime12h } from '@/utils/format'
import { downloadCSV, sharePaymentSummary, printPaymentSummary } from '@/utils/export'
import { useApp } from '@/context/AppContext'
import type { Shift } from '@/types'

type SummaryFilter = 'pending' | 'paid' | 'all'

export function PaymentSummary() {
  const { showToast, refreshKey } = useApp()
  const [filter, setFilter] = useState<SummaryFilter>('pending')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = filter === 'all'
          ? await getAllShifts()
          : await getShiftsByStatus(filter)
        if (!cancelled) setShifts(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [filter, refreshKey])

  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0)
  const totalEarnings = shifts.reduce((sum, s) => sum + s.earnings, 0)

  const dateRange = shifts.length > 0
    ? {
        start: [...shifts].sort((a, b) => a.date.localeCompare(b.date))[0].date,
        end: [...shifts].sort((a, b) => b.date.localeCompare(a.date))[0].date,
      }
    : null

  const handleExportCSV = () => {
    if (shifts.length === 0) { showToast('No shifts to export', 'warning'); return }
    downloadCSV(shifts)
    showToast('CSV downloaded', 'success')
  }

  const handleShare = async () => {
    if (shifts.length === 0) { showToast('No shifts to share', 'warning'); return }
    const ok = await sharePaymentSummary(shifts)
    if (ok) showToast('Summary shared / copied to clipboard', 'success')
    else showToast('Could not share summary', 'error')
  }

  const handlePrint = () => {
    if (shifts.length === 0) { showToast('No shifts to print', 'warning'); return }
    printPaymentSummary(shifts)
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>Payment Summary</h1>
      </header>

      <div className="page-content">
        <div className="page-padding">
          {/* Filter tabs */}
          <div className="tabs" style={{ marginTop: 16, marginBottom: 16 }}>
            <button className={`tab-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
              Pending
            </button>
            <button className={`tab-btn ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>
              Paid
            </button>
            <button className={`tab-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              All
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <span className="loading-spinner" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <div className="empty-state-title">No shifts found</div>
              <div className="empty-state-desc">
                Log some shifts first and they'll appear here for your payment summary.
              </div>
            </div>
          ) : (
            <>
              {/* Totals hero card */}
              <div className="summary-total-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="summary-total-label">
                      {filter === 'pending' ? 'Pending Payment' : filter === 'paid' ? 'Total Received' : 'All Earnings'}
                    </div>
                    <div className="summary-total-value">{formatCurrency(totalEarnings)}</div>
                    <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                      {formatHours(totalHours)} · {shifts.length} shift{shifts.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', opacity: 0.8 }}>
                    {dateRange && (
                      <>
                        <div style={{ fontSize: 11, marginBottom: 2 }}>Period</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {formatDateShort(dateRange.start)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          — {formatDateShort(dateRange.end)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                  className="btn btn-surface btn-sm"
                  style={{ flex: 1, flexDirection: 'column', gap: 4, height: 'auto', padding: '12px 8px', borderRadius: 'var(--radius-lg)' }}
                  onClick={handleExportCSV}
                >
                  <span style={{ fontSize: 20 }}>📥</span>
                  <span style={{ fontSize: 12 }}>Export CSV</span>
                </button>
                <button
                  className="btn btn-surface btn-sm"
                  style={{ flex: 1, flexDirection: 'column', gap: 4, height: 'auto', padding: '12px 8px', borderRadius: 'var(--radius-lg)' }}
                  onClick={handlePrint}
                >
                  <span style={{ fontSize: 20 }}>🖨️</span>
                  <span style={{ fontSize: 12 }}>Print</span>
                </button>
                <button
                  className="btn btn-surface btn-sm"
                  style={{ flex: 1, flexDirection: 'column', gap: 4, height: 'auto', padding: '12px 8px', borderRadius: 'var(--radius-lg)' }}
                  onClick={handleShare}
                >
                  <span style={{ fontSize: 20 }}>📤</span>
                  <span style={{ fontSize: 12 }}>Share</span>
                </button>
              </div>

              {/* Shift rows */}
              <div className="section-label">Shift Details</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                {shifts.map((shift, i) => (
                  <div
                    key={shift.id}
                    className="summary-table-row"
                    style={{
                      padding: '12px 16px',
                      borderBottom: i < shifts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {formatDate(shift.date)}
                      </div>
                      {shift.startTime && shift.endTime && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                          {formatTime12h(shift.startTime)} – {formatTime12h(shift.endTime)}
                        </div>
                      )}
                      {shift.notes ? (
                        <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2 }}>
                          {shift.notes}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ textAlign: 'center', minWidth: 52 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {formatHours(shift.hoursWorked)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        ${shift.hourlyRate}/hr
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: 72 }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: shift.status === 'paid' ? 'var(--text-2)' : 'var(--success)',
                        fontFamily: 'DM Mono, monospace',
                      }}>
                        ${shift.earnings.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: shift.status === 'paid' ? 'var(--success)' : 'var(--warning)' }}>
                        {shift.status === 'paid' ? '✓ paid' : '⏳ unpaid'}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Totals row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 16px',
                  background: 'var(--surface-2)',
                  borderTop: '2px solid var(--border)',
                }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    TOTAL
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 52, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {formatHours(totalHours)}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    minWidth: 72,
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    fontFamily: 'DM Mono, monospace',
                  }}>
                    ${totalEarnings.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Show employer tip */}
              <div className="card" style={{
                padding: '12px 16px',
                background: 'var(--primary-glow-lg)',
                borderColor: 'var(--primary)',
                fontSize: 13,
                color: 'var(--text-2)',
                lineHeight: 1.5,
                marginBottom: 16,
              }}>
                <strong style={{ color: 'var(--primary)' }}>💡 Show to employer</strong><br />
                Use Share or Print to send this summary to your employer before receiving payment.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
