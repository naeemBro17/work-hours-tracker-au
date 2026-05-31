import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { BottomNav } from '@/components/BottomNav'
import { ToastContainer } from '@/components/Toast'
import { Dashboard } from '@/pages/Dashboard'
import { AddShift } from '@/pages/AddShift'
import { History } from '@/pages/History'
import { PaymentSummary } from '@/pages/PaymentSummary'
import { Settings } from '@/pages/Settings'

function AppShell() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <ToastContainer />

      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddShift />} />
          <Route path="/history" element={<History />} />
          <Route path="/summary" element={<PaymentSummary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  )
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  )
}
