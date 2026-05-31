import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { AppSettings, ActiveShift, Toast, ToastType } from '@/types'
import {
  getSettings,
  saveSettings,
  getActiveShift,
  saveActiveShift,
  clearActiveShift,
  createShift,
  DEFAULT_SETTINGS,
} from '@/db/database'

// ============================================================
// CONTEXT TYPES
// ============================================================

interface AppContextValue {
  // Settings
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>
  settingsLoaded: boolean

  // Active shift
  activeShift: ActiveShift | null
  startShift: (hourlyRate: number, notes: string) => Promise<void>
  pauseShift: () => Promise<void>
  resumeShift: () => Promise<void>
  endShift: () => Promise<void>
  activeShiftLoaded: boolean

  // Toast notifications
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  dismissToast: (id: string) => void

  // Refresh trigger (to re-fetch data after mutations)
  refreshKey: number
  triggerRefresh: () => void
}

// ============================================================
// CONTEXT
// ============================================================

const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// ============================================================
// PROVIDER
// ============================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [activeShiftLoaded, setActiveShiftLoaded] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ---- Load initial state ----
  useEffect(() => {
    async function init() {
      const [s, active] = await Promise.all([getSettings(), getActiveShift()])
      setSettings(s)
      setSettingsLoaded(true)
      setActiveShift(active)
      setActiveShiftLoaded(true)
    }
    init()
  }, [])

  // ---- Apply dark mode ----
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light')
  }, [settings.darkMode])

  // ---- Settings ----
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    await saveSettings(newSettings)
  }, [settings])

  // ---- Toast ----
  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts(prev => [...prev, { id, message, type, duration }])
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      toastTimers.current.delete(id)
    }, duration)
    toastTimers.current.set(id, timer)
  }, [])

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ---- Refresh ----
  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // ---- Active Shift ----
  const startShift = useCallback(async (hourlyRate: number, notes: string) => {
    // Prevent multiple active shifts
    if (activeShift) {
      showToast('A shift is already running. Please end it first.', 'warning')
      return
    }

    const shift: ActiveShift = {
      id: `active-${Date.now()}`,
      startTimestamp: Date.now(),
      totalPausedMs: 0,
      hourlyRate,
      notes,
    }
    await saveActiveShift(shift)
    setActiveShift(shift)

    // Web notification
    if (settings.notificationsEnabled) {
      sendNotification('Shift Started ▶', {
        body: `Started at ${formatTime(new Date())} · AUD $${hourlyRate}/hr`,
        tag: 'shift-start',
      })
    }

    // Set long-running reminder (4 hours)
    scheduleLongRunningReminder()

    showToast('Shift started!', 'success')
    triggerRefresh()
  }, [activeShift, settings.notificationsEnabled, showToast, triggerRefresh])

  const pauseShift = useCallback(async () => {
    if (!activeShift || activeShift.pausedAt) return
    const paused = { ...activeShift, pausedAt: Date.now() }
    await saveActiveShift(paused)
    setActiveShift(paused)
    showToast('Shift paused', 'info')
  }, [activeShift, showToast])

  const resumeShift = useCallback(async () => {
    if (!activeShift || !activeShift.pausedAt) return
    const now = Date.now()
    const pausedDuration = now - activeShift.pausedAt
    const resumed = {
      ...activeShift,
      pausedAt: undefined,
      totalPausedMs: activeShift.totalPausedMs + pausedDuration,
    }
    await saveActiveShift(resumed)
    setActiveShift(resumed)
    showToast('Shift resumed', 'success')
  }, [activeShift, showToast])

  const endShift = useCallback(async () => {
    if (!activeShift) return

    const now = Date.now()
    const endTimestamp = activeShift.pausedAt || now

    // Calculate active duration
    const totalElapsedMs = endTimestamp - activeShift.startTimestamp
    const activeMs = totalElapsedMs - activeShift.totalPausedMs
    const hoursWorked = Math.max(0, activeMs / (1000 * 60 * 60))
    const earnings = hoursWorked * activeShift.hourlyRate

    // Round to 2 decimal places
    const roundedHours = Math.round(hoursWorked * 100) / 100
    const roundedEarnings = Math.round(earnings * 100) / 100

    // Get date from start time
    const startDate = new Date(activeShift.startTimestamp)
    const dateStr = startDate.toISOString().split('T')[0]

    // Save completed shift
    await createShift({
      date: dateStr,
      startTime: formatTimeHHMM(startDate),
      endTime: formatTimeHHMM(new Date(endTimestamp)),
      breakMinutes: Math.round(activeShift.totalPausedMs / 60000),
      hoursWorked: roundedHours,
      hourlyRate: activeShift.hourlyRate,
      earnings: roundedEarnings,
      notes: activeShift.notes,
      status: 'pending',
      entryMethod: 'stopwatch',
    })

    // Notification
    if (settings.notificationsEnabled) {
      sendNotification('Shift Ended ⏹', {
        body: `${formatHours(roundedHours)} worked · AUD $${roundedEarnings.toFixed(2)} earned`,
        tag: 'shift-end',
      })
    }

    await clearActiveShift()
    setActiveShift(null)
    showToast(`Shift ended — ${formatHours(roundedHours)} · $${roundedEarnings.toFixed(2)}`, 'success', 5000)
    triggerRefresh()
  }, [activeShift, settings.notificationsEnabled, showToast, triggerRefresh])

  const value: AppContextValue = {
    settings,
    updateSettings,
    settingsLoaded,
    activeShift,
    startShift,
    pauseShift,
    resumeShift,
    endShift,
    activeShiftLoaded,
    toasts,
    showToast,
    dismissToast,
    refreshKey,
    triggerRefresh,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ============================================================
// HELPERS
// ============================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function sendNotification(title: string, options: NotificationOptions) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...options,
      })
    } catch {
      // Notifications may fail silently in some contexts
    }
  }
}

let longRunningTimer: ReturnType<typeof setTimeout> | null = null

function scheduleLongRunningReminder() {
  if (longRunningTimer) clearTimeout(longRunningTimer)
  // Remind after 4 hours
  longRunningTimer = setTimeout(() => {
    sendNotification('⚠️ Shift is still running', {
      body: 'You have been working for over 4 hours. Tap to check.',
      tag: 'shift-long',
    })
  }, 4 * 60 * 60 * 1000)
}
