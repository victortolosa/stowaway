import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { RootErrorBoundary } from '@/components'
import { registerSW } from 'virtual:pwa-register'

// Register service worker
registerSW()

// BUILD VERSION CHECK - Verify if we are running the latest code
console.log('%c STOWAWAY DEBUG BUILD: v2024-02-01-FIX-01', 'background: #222; color: #bada55; padding: 4px; font-size: 14px');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
)
