import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { computeDashboardStats } from '@/db/database'
import { formatCurrency, formatHours } from '@/utils/format'
import { ActiveShiftCard } from '@/components/ActiveShiftCard'
import type { DashboardStats } from '@/types'

export function Dashboard() {
  const { activeShift, activeShiftLoaded, refreshKey, settings, settingsLoaded } = useApp()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await computeDashboardStats()
        if (!cancelled) {
          setStats(s)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  const isLoading = loading || !settingsLoaded || !activeShiftLoaded

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div style={{
          background: 'var(--primary-glow)',
          border: '1px solid var(--primary)',
          borderRadius: 'var(--radius-full)',
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--primary)',
          fontFamily: 'DM Mono, monospace',
        }}>
          ${settings.hourlyRate.toFixed(2)}/hr
        </div>
      </header>

      <div className="page-content">
        {/* Active shift card */}
        {activeShift && <ActiveShiftCard />}

        <div className="page-padding">
          {/* Today stats */}
          <div className="section-label" style={{ marginTop: 16 }}>Today</div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <StatCard
              label="Hours Worked"
              value={isLoading ? '—' : formatHours(stats?.todayHours ?? 0)}
              icon="⏱"
              iconBg="rgba(124,92,252,0.15)"
              sub={isLoading ? '' : `${(stats?.todayHours ?? 0).toFixed(2)} hrs total`}
            />
            <StatCard
              label="Today's Earnings"
              value={isLoading ? '—' : formatCurrency(stats?.todayEarnings ?? 0)}
              icon="💵"
              iconBg="rgba(34,209,122,0.15)"
              valueColor={stats?.todayEarnings ? 'var(--success)' : undefined}
            />
          </div>

          {/* This week */}
          <div className="section-label">This Week</div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <StatCard
              label="Week Hours"
              value={isLoading ? '—' : formatHours(stats?.weekHours ?? 0)}
              icon="📅"
              iconBg="rgba(96,184,255,0.15)"
            />
            <StatCard
              label="Week Earnings"
              value={isLoading ? '—' : formatCurrency(stats?.weekEarnings ?? 0)}
              icon="💰"
              iconBg="rgba(255,181,71,0.15)"
              valueColor={stats?.weekEarnings ? 'var(--warning)' : undefined}
            />
          </div>

          {/* Pending & Lifetime */}
          <div className="section-label">Overview</div>

          {/* Pending earnings big card */}
          <div
            className="card"
            style={{
              marginBottom: 12,
              background: stats?.pendingEarnings ? 'linear-gradient(135deg, rgba(255,181,71,0.08), rgba(255,181,71,0.03))' : undefined,
              borderColor: stats?.pendingEarnings ? 'rgba(255,181,71,0.3)' : undefined,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/history')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-card-label">Pending Earnings</div>
                <div
                  className="stat-card-value"
                  style={{
                    fontSize: 32,
                    color: stats?.pendingEarnings ? 'var(--warning)' : 'var(--text)',
                    marginTop: 4,
                  }}
                >
                  {isLoading ? '—' : formatCurrency(stats?.pendingEarnings ?? 0)}
                </div>
                <div className="stat-card-sub" style={{ marginTop: 4 }}>
                  {isLoading ? '' : `${stats?.totalPendingShifts ?? 0} unpaid shift${stats?.totalPendingShifts !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div style={{ fontSize: 36, opacity: 0.6 }}>⏳</div>
            </div>

            {(stats?.totalPendingShifts ?? 0) > 0 && (
              <div style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'rgba(255,181,71,0.1)',
                borderRadius: 8,
                fontSize: 13,
                color: 'var(--warning)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>→</span>
                Tap to view & mark as paid
              </div>
            )}
          </div>

          {/* Lifetime earnings */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-card-label">Lifetime Earnings</div>
                <div className="stat-card-value" style={{ fontSize: 32, color: 'var(--primary)', marginTop: 4 }}>
                  {isLoading ? '—' : formatCurrency(stats?.lifetimeEarnings ?? 0)}
                </div>
                <div className="stat-card-sub" style={{ marginTop: 4 }}>All time · AUD</div>
              </div>
              <div style={{ fontSize: 36, opacity: 0.6 }}>🏆</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="section-label">Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => navigate('/add')}
              style={{ justifyContent: 'flex-start', gap: 12, paddingLeft: 20 }}
            >
              <span style={{ fontSize: 20 }}>+</span>
              Log Work Hours
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-surface btn-sm"
                style={{ flex: 1 }}
                onClick={() => navigate('/history')}
              >
                📋 View History
              </button>
              <button
                className="btn btn-surface btn-sm"
                style={{ flex: 1 }}
                onClick={() => navigate('/summary')}
              >
                📄 Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  icon: string
  iconBg: string
  sub?: string
  valueColor?: string
}

function StatCard({ label, value, icon, iconBg, sub, valueColor }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: iconBg }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div className="stat-card-label" style={{ marginTop: 8 }}>{label}</div>
      <div className="stat-card-value" style={{ fontSize: 22, color: valueColor }}>
        {value}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}
