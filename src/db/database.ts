import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Shift, ActiveShift, AppSettings } from '@/types'

// ============================================================
// DATABASE SCHEMA
// ============================================================

interface WorkTrackerDB extends DBSchema {
  shifts: {
    key: string
    value: Shift
    indexes: {
      'by-date': string
      'by-status': string
      'by-created': number
    }
  }
  settings: {
    key: string
    value: AppSettings
  }
  activeShift: {
    key: string
    value: ActiveShift
  }
}

const DB_NAME = 'work-hours-tracker-au'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<WorkTrackerDB> | null = null

async function getDB(): Promise<IDBPDatabase<WorkTrackerDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<WorkTrackerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Shifts store
      if (!db.objectStoreNames.contains('shifts')) {
        const shiftStore = db.createObjectStore('shifts', { keyPath: 'id' })
        shiftStore.createIndex('by-date', 'date')
        shiftStore.createIndex('by-status', 'status')
        shiftStore.createIndex('by-created', 'createdAt')
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' as never })
      }

      // Active shift store (single record)
      if (!db.objectStoreNames.contains('activeShift')) {
        db.createObjectStore('activeShift', { keyPath: 'id' })
      }
    },
    blocked() {
      console.warn('Database blocked by another version')
    },
    blocking() {
      dbInstance?.close()
      dbInstance = null
    },
  })

  return dbInstance
}

// ============================================================
// DEFAULT SETTINGS
// ============================================================

export const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 25.00,
  darkMode: true,
  currency: 'AUD',
  notificationsEnabled: true,
  version: 1,
}

// ============================================================
// SETTINGS
// ============================================================

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const stored = await db.get('settings', 'app' as never)
  if (!stored) {
    await saveSettings(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  return stored as unknown as AppSettings
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { ...settings, key: 'app' } as never)
}

// ============================================================
// SHIFTS - CREATE
// ============================================================

export async function createShift(shift: Omit<Shift, 'id' | 'createdAt'>): Promise<Shift> {
  const db = await getDB()
  const newShift: Shift = {
    ...shift,
    id: generateId(),
    createdAt: Date.now(),
  }
  await db.put('shifts', newShift)
  return newShift
}

// ============================================================
// SHIFTS - READ
// ============================================================

export async function getAllShifts(): Promise<Shift[]> {
  const db = await getDB()
  const shifts = await db.getAll('shifts')
  // Sort by date descending, then by createdAt descending
  return shifts.sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date)
    if (dateDiff !== 0) return dateDiff
    return b.createdAt - a.createdAt
  })
}

export async function getShiftsByStatus(status: 'pending' | 'paid'): Promise<Shift[]> {
  const db = await getDB()
  const index = db.transaction('shifts').store.index('by-status')
  const shifts = await index.getAll(status)
  return shifts.sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date)
    if (dateDiff !== 0) return dateDiff
    return b.createdAt - a.createdAt
  })
}

export async function getShiftById(id: string): Promise<Shift | undefined> {
  const db = await getDB()
  return db.get('shifts', id)
}

export async function getShiftsByDateRange(startDate: string, endDate: string): Promise<Shift[]> {
  const db = await getDB()
  const all = await db.getAll('shifts')
  return all
    .filter(s => s.date >= startDate && s.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function getTodayShifts(): Promise<Shift[]> {
  const today = getTodayString()
  const db = await getDB()
  const index = db.transaction('shifts').store.index('by-date')
  return index.getAll(today)
}

// ============================================================
// SHIFTS - UPDATE
// ============================================================

export async function updateShift(shift: Shift): Promise<void> {
  const db = await getDB()
  await db.put('shifts', shift)
}

export async function markAllPendingAsPaid(): Promise<number> {
  const db = await getDB()
  const pending = await getShiftsByStatus('pending')
  const now = Date.now()
  const tx = db.transaction('shifts', 'readwrite')
  
  await Promise.all(
    pending.map(shift =>
      tx.store.put({ ...shift, status: 'paid', paidAt: now })
    )
  )
  await tx.done
  return pending.length
}

// ============================================================
// SHIFTS - DELETE
// ============================================================

export async function deleteShift(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('shifts', id)
}

export async function deleteAllData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['shifts', 'activeShift'], 'readwrite')
  await tx.objectStore('shifts').clear()
  await tx.objectStore('activeShift').clear()
  await tx.done
}

// ============================================================
// ACTIVE SHIFT
// ============================================================

const ACTIVE_SHIFT_KEY = 'current'

export async function saveActiveShift(shift: ActiveShift): Promise<void> {
  const db = await getDB()
  await db.put('activeShift', { ...shift, id: ACTIVE_SHIFT_KEY })
  // Also save to localStorage for immediate access after refresh
  localStorage.setItem('activeShift', JSON.stringify({ ...shift, id: ACTIVE_SHIFT_KEY }))
}

export async function getActiveShift(): Promise<ActiveShift | null> {
  // Check localStorage first (faster, survives page reload)
  const stored = localStorage.getItem('activeShift')
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as ActiveShift
      // Verify it also exists in IndexedDB (data integrity)
      const db = await getDB()
      const dbRecord = await db.get('activeShift', ACTIVE_SHIFT_KEY)
      if (!dbRecord) {
        // Restore to IndexedDB from localStorage
        await db.put('activeShift', parsed)
      }
      return parsed
    } catch {
      localStorage.removeItem('activeShift')
    }
  }

  // Fall back to IndexedDB
  const db = await getDB()
  const record = await db.get('activeShift', ACTIVE_SHIFT_KEY)
  if (record) {
    localStorage.setItem('activeShift', JSON.stringify(record))
    return record
  }

  return null
}

export async function clearActiveShift(): Promise<void> {
  const db = await getDB()
  await db.delete('activeShift', ACTIVE_SHIFT_KEY)
  localStorage.removeItem('activeShift')
}

// ============================================================
// BACKUP & RESTORE
// ============================================================

export interface BackupData {
  version: number
  exportedAt: number
  shifts: Shift[]
  settings: AppSettings
}

export async function exportBackup(): Promise<BackupData> {
  const [shifts, settings] = await Promise.all([getAllShifts(), getSettings()])
  return {
    version: 1,
    exportedAt: Date.now(),
    shifts,
    settings,
  }
}

export async function importBackup(data: BackupData): Promise<{ shiftsImported: number }> {
  if (!data.version || !data.shifts || !Array.isArray(data.shifts)) {
    throw new Error('Invalid backup file format')
  }

  const db = await getDB()
  
  // Import shifts (merge - don't delete existing)
  const tx = db.transaction('shifts', 'readwrite')
  let count = 0
  for (const shift of data.shifts) {
    if (isValidShift(shift)) {
      await tx.store.put(shift)
      count++
    }
  }
  await tx.done

  // Import settings if present
  if (data.settings) {
    await saveSettings({ ...DEFAULT_SETTINGS, ...data.settings })
  }

  return { shiftsImported: count }
}

// ============================================================
// UTILITIES
// ============================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isValidShift(obj: unknown): obj is Shift {
  if (!obj || typeof obj !== 'object') return false
  const s = obj as Record<string, unknown>
  return (
    typeof s.id === 'string' &&
    typeof s.date === 'string' &&
    typeof s.hoursWorked === 'number' &&
    typeof s.hourlyRate === 'number' &&
    typeof s.earnings === 'number' &&
    (s.status === 'pending' || s.status === 'paid')
  )
}

// ============================================================
// STATS COMPUTATION
// ============================================================

export async function computeDashboardStats() {
  const today = getTodayString()
  const [allShifts, settings] = await Promise.all([getAllShifts(), getSettings()])

  // Get start of current week (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const weekStart = monday.toISOString().split('T')[0]

  const todayShifts = allShifts.filter(s => s.date === today)
  const pendingShifts = allShifts.filter(s => s.status === 'pending')
  const weekShifts = allShifts.filter(s => s.date >= weekStart && s.date <= today)

  return {
    todayHours: todayShifts.reduce((sum, s) => sum + s.hoursWorked, 0),
    todayEarnings: todayShifts.reduce((sum, s) => sum + s.earnings, 0),
    pendingEarnings: pendingShifts.reduce((sum, s) => sum + s.earnings, 0),
    lifetimeEarnings: allShifts.reduce((sum, s) => sum + s.earnings, 0),
    totalPendingShifts: pendingShifts.length,
    currentRate: settings.hourlyRate,
    weekHours: weekShifts.reduce((sum, s) => sum + s.hoursWorked, 0),
    weekEarnings: weekShifts.reduce((sum, s) => sum + s.earnings, 0),
  }
}
