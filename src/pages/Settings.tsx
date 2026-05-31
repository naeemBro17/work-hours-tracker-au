import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { exportBackup, importBackup, deleteAllData } from '@/db/database'
import { downloadBackup, readBackupFile } from '@/utils/export'
import { downloadCSV } from '@/utils/export'
import { getAllShifts } from '@/db/database'
import { Modal } from '@/components/Modal'

export function Settings() {
  const { settings, updateSettings, showToast, triggerRefresh } = useApp()
  const [rateInput, setRateInput] = useState(settings.hourlyRate.toString())
  const [showRateModal, setShowRateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveRate = async () => {
    const r = parseFloat(rateInput)
    if (isNaN(r) || r <= 0) {
      showToast('Enter a valid hourly rate', 'error')
      return
    }
    await updateSettings({ hourlyRate: Math.round(r * 100) / 100 })
    setShowRateModal(false)
    showToast(`Hourly rate updated to $${r.toFixed(2)}/hr`, 'success')
    triggerRefresh()
  }

  const handleToggleDarkMode = async () => {
    await updateSettings({ darkMode: !settings.darkMode })
  }

  const handleToggleNotifications = async () => {
    if (!settings.notificationsEnabled) {
      // Request permission first
      if ('Notification' in window && Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          showToast('Notification permission denied', 'warning')
          return
        }
      }
    }
    await updateSettings({ notificationsEnabled: !settings.notificationsEnabled })
  }

  const handleExportCSV = async () => {
    try {
      const shifts = await getAllShifts()
      if (shifts.length === 0) { showToast('No shifts to export', 'warning'); return }
      downloadCSV(shifts)
      showToast('CSV exported successfully', 'success')
    } catch {
      showToast('Export failed', 'error')
    }
  }

  const handleBackup = async () => {
    try {
      const data = await exportBackup()
      downloadBackup(data)
      showToast('Backup saved to your device', 'success')
    } catch {
      showToast('Backup failed', 'error')
    }
  }

  const handleRestore = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const data = await readBackupFile(file)
      const result = await importBackup(data as Parameters<typeof importBackup>[0])
      showToast(`Restored ${result.shiftsImported} shifts from backup`, 'success', 5000)
      triggerRefresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Restore failed — invalid backup file', 'error')
    }
  }

  const handleDeleteAll = async () => {
    if (deleteInput.trim().toUpperCase() !== 'DELETE') {
      showToast('Type DELETE to confirm', 'warning')
      return
    }
    setDeleting(true)
    try {
      await deleteAllData()
      showToast('All data deleted permanently', 'success')
      triggerRefresh()
      setShowDeleteModal(false)
      setDeleteConfirmStep(0)
      setDeleteInput('')
    } catch {
      showToast('Delete failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <h1>Settings</h1>
      </header>

      <div className="page-content">
        <div className="page-padding">
          <div className="flex-col gap-4" style={{ marginTop: 16 }}>

            {/* Rate */}
            <div>
              <div className="section-label">Pay Rate</div>
              <div className="settings-section">
                <div
                  className="settings-row"
                  onClick={() => { setRateInput(settings.hourlyRate.toString()); setShowRateModal(true) }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="settings-row-icon" style={{ background: 'rgba(124,92,252,0.15)' }}>💰</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Hourly Rate</div>
                    <div className="settings-row-desc">Current rate for new shifts</div>
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    fontFamily: 'DM Mono, monospace',
                    marginRight: 4,
                  }}>
                    ${settings.hourlyRate.toFixed(2)}
                  </div>
                  <ChevronIcon />
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, paddingLeft: 4 }}>
                Changing your rate only affects future shifts. Past shifts keep their original rate.
              </p>
            </div>

            {/* Appearance */}
            <div>
              <div className="section-label">Appearance</div>
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-row-icon" style={{ background: 'rgba(96,184,255,0.15)' }}>🌙</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Dark Mode</div>
                    <div className="settings-row-desc">{settings.darkMode ? 'Currently dark' : 'Currently light'}</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={handleToggleDarkMode}
                    />
                    <span className="toggle-track" />
                  </label>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <div className="section-label">Notifications</div>
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-row-icon" style={{ background: 'rgba(255,181,71,0.15)' }}>🔔</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Shift Notifications</div>
                    <div className="settings-row-desc">Alerts when shift starts, ends, or runs long</div>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={settings.notificationsEnabled}
                      onChange={handleToggleNotifications}
                    />
                    <span className="toggle-track" />
                  </label>
                </div>
              </div>
            </div>

            {/* Data */}
            <div>
              <div className="section-label">Data Management</div>
              <div className="settings-section">
                <div
                  className="settings-row"
                  onClick={handleExportCSV}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="settings-row-icon" style={{ background: 'rgba(34,209,122,0.15)' }}>📥</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Export CSV</div>
                    <div className="settings-row-desc">Download all shifts as a spreadsheet</div>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="settings-row" onClick={handleBackup} style={{ cursor: 'pointer' }}>
                  <div className="settings-row-icon" style={{ background: 'rgba(96,184,255,0.15)' }}>💾</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Backup Data</div>
                    <div className="settings-row-desc">Save all data as a JSON backup file</div>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="settings-row" onClick={handleRestore} style={{ cursor: 'pointer' }}>
                  <div className="settings-row-icon" style={{ background: 'rgba(255,181,71,0.15)' }}>📤</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Restore Data</div>
                    <div className="settings-row-desc">Import shifts from a backup file</div>
                  </div>
                  <ChevronIcon />
                </div>
              </div>
            </div>

            {/* About */}
            <div>
              <div className="section-label">About</div>
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-row-icon" style={{ background: 'rgba(124,92,252,0.15)' }}>⏱</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Work Hours Tracker AU</div>
                    <div className="settings-row-desc">Version 1.0.0</div>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-icon" style={{ background: 'rgba(34,209,122,0.15)' }}>🔒</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title">Privacy</div>
                    <div className="settings-row-desc">All data stored locally — never uploaded</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div>
              <div className="section-label" style={{ color: 'var(--danger)' }}>Danger Zone</div>
              <div className="settings-section" style={{ borderColor: 'var(--danger)', overflow: 'hidden' }}>
                <div
                  className="settings-row"
                  onClick={() => { setDeleteConfirmStep(1); setShowDeleteModal(true) }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="settings-row-icon" style={{ background: 'var(--danger-dim)' }}>🗑️</div>
                  <div className="settings-row-content">
                    <div className="settings-row-title" style={{ color: 'var(--danger)' }}>Delete All Data</div>
                    <div className="settings-row-desc">Permanently remove all shifts and settings</div>
                  </div>
                  <ChevronIcon />
                </div>
              </div>
            </div>

            <div style={{ height: 8 }} />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* Rate modal */}
      <Modal open={showRateModal} onClose={() => setShowRateModal(false)} title="Change Hourly Rate" variant="centered">
        <div className="flex-col gap-4">
          <div className="form-group">
            <label className="form-label">New Hourly Rate (AUD)</label>
            <input
              type="number"
              className="form-input"
              value={rateInput}
              onChange={e => setRateInput(e.target.value)}
              step="0.50"
              min="0"
              placeholder="e.g. 25.00"
              inputMode="decimal"
              autoFocus
            />
            <span className="form-hint">Only new shifts will use this rate. Existing shifts are unaffected.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-surface btn-sm" style={{ flex: 1 }} onClick={() => setShowRateModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleSaveRate}>
              Save Rate
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmStep(0); setDeleteInput('') }}
        variant="centered"
      >
        {deleteConfirmStep === 1 && (
          <div className="flex-col gap-4" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>
                Delete All Data?
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
                This will permanently delete ALL your shifts and settings. This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-surface btn-sm" style={{ flex: 1 }} onClick={() => { setShowDeleteModal(false); setDeleteConfirmStep(0) }}>
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{ flex: 1, background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                onClick={() => setDeleteConfirmStep(2)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {deleteConfirmStep === 2 && (
          <div className="flex-col gap-4">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🗑️</div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>
                Final Confirmation
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Type <strong style={{ color: 'var(--danger)', fontFamily: 'DM Mono, monospace' }}>DELETE</strong> below to confirm permanent deletion of all data.
              </p>
            </div>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Type DELETE here"
                style={{ textAlign: 'center', letterSpacing: 2, fontWeight: 700 }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-surface btn-sm" style={{ flex: 1 }} onClick={() => { setShowDeleteModal(false); setDeleteConfirmStep(0); setDeleteInput('') }}>
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                style={{ flex: 1, opacity: deleteInput.trim().toUpperCase() === 'DELETE' ? 1 : 0.4 }}
                onClick={handleDeleteAll}
                disabled={deleting || deleteInput.trim().toUpperCase() !== 'DELETE'}
              >
                {deleting ? <span className="loading-spinner" style={{ width: 16, height: 16 }} /> : 'Delete Everything'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6"/>
  </svg>
)
