// ============================================================
// CURRENCY & NUMBER FORMATTING
// ============================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: 'compact',
    }).format(amount)
  }
  return formatCurrency(amount)
}

// ============================================================
// TIME & HOURS FORMATTING
// ============================================================

export function formatHours(hours: number): string {
  if (hours < 0) return '0h 0m'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0 && m === 0) return '0m'
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatHoursDecimal(hours: number): string {
  return `${hours.toFixed(2)}h`
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  return `${hh}:${mm}:${ss}`
}

export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60)
}

// ============================================================
// DATE FORMATTING
// ============================================================

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatDateFull(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString()
}

export function isThisWeek(dateStr: string): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const weekStart = monday.toISOString().split('T')[0]
  const weekEnd = getTodayString()
  return dateStr >= weekStart && dateStr <= weekEnd
}

// ============================================================
// RATE FORMATTING
// ============================================================

export function formatRate(rate: number): string {
  return `$${rate.toFixed(2)}/hr`
}

// ============================================================
// CALCULATIONS
// ============================================================

export function calculateEarnings(hoursWorked: number, hourlyRate: number): number {
  return Math.round(hoursWorked * hourlyRate * 100) / 100
}

export function calculateHoursFromTimeRange(
  startTime: string,
  endTime: string,
  breakMinutes: number
): number | null {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null

  let startMinutes = sh * 60 + sm
  let endMinutes = eh * 60 + em

  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

  const workingMinutes = endMinutes - startMinutes - breakMinutes
  if (workingMinutes <= 0) return null

  return Math.round((workingMinutes / 60) * 100) / 100
}
