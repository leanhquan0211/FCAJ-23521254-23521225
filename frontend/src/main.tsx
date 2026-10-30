import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { SakuraBackdrop } from '@/components/SakuraBackdrop'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SakuraBackdrop />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
