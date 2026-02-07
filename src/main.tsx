import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { RootErrorBoundary } from '@/components'
import { registerSW } from 'virtual:pwa-register'

// Prevent browser/page zoom to keep interaction closer to a native app shell.
document.addEventListener('gesturestart', (event) => {
  event.preventDefault()
})

document.addEventListener('gesturechange', (event) => {
  event.preventDefault()
})

document.addEventListener('gestureend', (event) => {
  event.preventDefault()
})

window.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey) {
      event.preventDefault()
    }
  },
  { passive: false },
)

// Register service worker
registerSW()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)
