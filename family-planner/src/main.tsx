import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Take new builds on the next load without prompting — nobody is standing at
// the wall display waiting to click "reload".
//
// Offline support is an enhancement, not a requirement: a service worker needs
// a secure, non-sandboxed origin, so a refusal here must never take the whole
// planner down with it.
// An embedded copy (a preview inside another page) has no business installing
// a service worker on the host's origin, and usually is not allowed to.
const embedded = window.self !== window.top

try {
  if (!embedded && 'serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onRegisterError: (error) =>
        console.info('Offline support is unavailable here.', error),
    })
  }
} catch (error) {
  console.info('Offline support is unavailable here.', error)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
