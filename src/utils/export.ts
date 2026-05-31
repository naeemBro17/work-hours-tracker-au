import type { Shift } from '@/types'
import { formatDate, formatHours, formatCurrency } from './format'

// ============================================================
// CSV EXPORT
// ============================================================

export function generateCSV(shifts: Shift[]): string {
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Break (mins)',
    'Hours Worked',
    'Hourly Rate (AUD)',
    'Earnings (AUD)',
    'Status',
    'Notes',
    'Entry Method',
  ]

  const rows = shifts.map(shift => [
    shift.date,
    shift.startTime ?? '',
    shift.endTime ?? '',
    String(shift.breakMinutes),
    shift.hoursWorked.toFixed(2),
    shift.hourlyRate.toFixed(2),
    shift.earnings.toFixed(2),
    shift.status,
    `"${(shift.notes ?? '').replace(/"/g, '""')}"`,
    shift.entryMethod,
  ])

  const csvLines = [headers.join(','), ...rows.map(r => r.join(','))]
  return csvLines.join('\n')
}

export function downloadCSV(shifts: Shift[], filename?: string): void {
  const csv = generateCSV(shifts)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? `work-hours-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================
// PAYMENT SUMMARY TEXT
// ============================================================

export function generatePaymentSummaryText(shifts: Shift[]): string {
  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0)
  const totalEarnings = shifts.reduce((sum, s) => sum + s.earnings, 0)

  const dateRange = getDateRange(shifts)

  let text = '═══════════════════════════════\n'
  text += '   WORK HOURS SUMMARY (AUD)\n'
  text += '═══════════════════════════════\n'

  if (dateRange) {
    text += `Period: ${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}\n`
  }
  text += `Generated: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n`

  shifts.forEach(shift => {
    text += `───────────────────────────────\n`
    text += `📅 ${formatDate(shift.date)}\n`
    if (shift.startTime && shift.endTime) {
      text += `   ${formatTime12h(shift.startTime)} – ${formatTime12h(shift.endTime)}`
      if (shift.breakMinutes > 0) text += ` (${shift.breakMinutes}m break)`
      text += '\n'
    }
    text += `   ${formatHours(shift.hoursWorked)} @ $${shift.hourlyRate.toFixed(2)}/hr\n`
    text += `   Earnings: ${formatCurrency(shift.earnings)}\n`
    if (shift.notes) text += `   Note: ${shift.notes}\n`
  })

  text += '═══════════════════════════════\n'
  text += `Total Hours:    ${formatHours(totalHours)}\n`
  text += `Total Earnings: ${formatCurrency(totalEarnings)}\n`
  text += '═══════════════════════════════\n'

  return text
}

export async function sharePaymentSummary(shifts: Shift[]): Promise<boolean> {
  const text = generatePaymentSummaryText(shifts)

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Work Hours Summary',
        text,
      })
      return true
    } catch {
      // User cancelled or share failed
      return false
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// ============================================================
// PRINT
// ============================================================

export function printPaymentSummary(shifts: Shift[]): void {
  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0)
  const totalEarnings = shifts.reduce((sum, s) => sum + s.earnings, 0)
  const dateRange = getDateRange(shifts)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Work Hours Summary</title>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; color: #111; padding: 32px; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    .summary-header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; padding: 10px 12px; background: #f4f4f4; font-weight: 600; border-bottom: 1px solid #ddd; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    .total-row td { font-weight: 700; border-top: 2px solid #111; border-bottom: none; font-size: 15px; }
    .right { text-align: right; }
    .note { color: #666; font-style: italic; font-size: 12px; }
    .footer { margin-top: 32px; color: #999; font-size: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="summary-header">
    <h1>Work Hours Summary</h1>
    <div class="subtitle">
      ${dateRange ? `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)} &nbsp;·&nbsp;` : ''}
      Generated ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Hours</th>
        <th>Rate</th>
        <th class="right">Earnings</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${shifts.map(s => `
        <tr>
          <td>${formatDate(s.date)}</td>
          <td>${formatHours(s.hoursWorked)}</td>
          <td>$${s.hourlyRate.toFixed(2)}/hr</td>
          <td class="right">${formatCurrency(s.earnings)}</td>
          <td class="note">${s.notes || '—'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td>TOTAL</td>
        <td>${formatHours(totalHours)}</td>
        <td></td>
        <td class="right">${formatCurrency(totalEarnings)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">Work Hours Tracker AU · ${shifts.length} shift${shifts.length !== 1 ? 's' : ''}</div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
  }
}

// ============================================================
// BACKUP
// ============================================================

export function downloadBackup(data: object): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `work-hours-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function readBackupFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        resolve(data)
      } catch {
        reject(new Error('Invalid backup file — not valid JSON'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// ============================================================
// HELPERS
// ============================================================

function getDateRange(shifts: Shift[]): { start: string; end: string } | null {
  if (shifts.length === 0) return null
  const dates = shifts.map(s => s.date).sort()
  return { start: dates[0], end: dates[dates.length - 1] }
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}
