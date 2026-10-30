import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { SakuraBackdrop } from '@/components/SakuraBackdrop'
import { applyAppearance, applyTheme, readAppearance, readTheme } from '@/lib/appearance-preferences'

// Restore preferences before rendering, including while the session is loading.
applyTheme(readTheme())
applyAppearance(readAppearance())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SakuraBackdrop />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
