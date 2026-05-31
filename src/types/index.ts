// ============================================================
// CORE DATA TYPES
// ============================================================

export type ShiftStatus = 'pending' | 'paid'
export type EntryMethod = 'manual' | 'timeRange' | 'stopwatch'

export interface Shift {
  id: string
  date: string          // YYYY-MM-DD
  startTime?: string    // HH:MM (24h format)
  endTime?: string      // HH:MM (24h format)
  breakMinutes: number
  hoursWorked: number   // Decimal hours (e.g. 7.5)
  hourlyRate: number    // AUD per hour at time of entry
  earnings: number      // hoursWorked * hourlyRate
  notes: string
  status: ShiftStatus
  entryMethod: EntryMethod
  createdAt: number     // Unix ms timestamp
  paidAt?: number       // Unix ms timestamp when marked paid
}

export interface ActiveShift {
  id: string
  startTimestamp: number    // Unix ms when shift started
  pausedAt?: number         // Unix ms when last paused (undefined if running)
  totalPausedMs: number     // Total milliseconds spent paused
  hourlyRate: number
  notes: string
}

export interface AppSettings {
  hourlyRate: number
  darkMode: boolean
  currency: 'AUD'
  notificationsEnabled: boolean
  version: number           // For future migrations
}

// ============================================================
// UI TYPES
// ============================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

export type TabId = 'dashboard' | 'add' | 'history' | 'summary' | 'settings'

export type HistoryTab = 'pending' | 'paid'

export type AddShiftMethod = 'manual' | 'timeRange' | 'stopwatch'

// ============================================================
// FORM TYPES
// ============================================================

export interface ManualEntryForm {
  date: string
  hoursWorked: string
  notes: string
}

export interface TimeRangeEntryForm {
  date: string
  startTime: string
  endTime: string
  breakMinutes: string
  notes: string
}

// ============================================================
// STATS TYPES
// ============================================================

export interface DashboardStats {
  todayHours: number
  todayEarnings: number
  pendingEarnings: number
  lifetimeEarnings: number
  totalPendingShifts: number
  currentRate: number
  weekHours: number
  weekEarnings: number
}

export interface PaymentSummaryData {
  shifts: Shift[]
  totalHours: number
  totalEarnings: number
  dateRange: { start: string; end: string } | null
}
