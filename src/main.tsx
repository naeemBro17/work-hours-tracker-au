import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './index.css'

// Register service worker with update prompt
const updateSW = registerSW({
  onNeedRefresh() {
    // App has update available — show unobtrusive notification
    const confirmed = window.confirm('A new version is available. Reload to update?')
    if (confirmed) updateSW(true)
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

// Request notification permission silently on first load
// (we only actually prompt when user starts a shift)
if ('Notification' in window && Notification.permission === 'default') {
  // Don't prompt immediately — wait for user action
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
