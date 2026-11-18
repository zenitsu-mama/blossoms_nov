import '@/styles/globals.css'
import App from './app/App'
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'

// A tab left open across a deploy still asks for the old build's page files, which no longer exist. Reload once to get
// the new build. The timestamp stops a reload loop if the file is genuinely missing.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'chunk-reload-at'
  let last = 0
  try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* storage blocked */ }
  if (Date.now() - last < 10_000) return // reloaded moments ago: let the error show
  try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* storage blocked */ }
  event.preventDefault()
  window.location.reload()
})

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Fade out the boot loader (index.html) once the app has painted, after a short minimum so it never flashes.
const loader = document.getElementById('boot-loader')
if (loader) {
  const shown = performance.now()
  const hide = () => {
    loader.classList.add('done')
    window.setTimeout(() => loader.remove(), 600)
  }
  const wait = Math.max(0, 900 - shown)
  window.addEventListener('load', () => window.setTimeout(hide, wait), { once: true })
  if (document.readyState === 'complete') window.setTimeout(hide, wait)
}
