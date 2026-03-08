/**
 * H.O.P.E. Citizen Instruction Manual — Main Entry
 * Year 888 A.Dk.
 *
 * "Cooperation secures a bright morning."
 */

import './style.css'
import { timeEngine } from './components/time-engine.js'
import { audio } from './components/audio-engine.js'
import { watchlight } from './components/watchlight-engine.js'
import { haptic } from './components/haptic-engine.js'
import { features, requestGyroscope } from './utils/detect.js'

// ── State ────────────────────────────────────────
let audioUnlocked = false
const sections = document.querySelectorAll('.section')
const navDots = document.querySelectorAll('.section-nav__dot')

// ── Audio Gate (first interaction) ───────────────
const audioGate = document.getElementById('audio-gate')

function dismissGate() {
  if (audioUnlocked) return
  audioUnlocked = true

  // Unlock audio context
  audio.unlock()

  // Start time-aware ambient
  audio.setTimeState(timeEngine.state)

  // Dismiss overlay
  audioGate.classList.add('dismissed')

  // Trigger cover animations
  setTimeout(() => initCoverAnimations(), 300)

  haptic.play('tap')
}

audioGate.addEventListener('touchstart', dismissGate, { once: true })
audioGate.addEventListener('click', dismissGate, { once: true })

// ── Time Engine ──────────────────────────────────
timeEngine.init()

timeEngine.on(({ from, to }) => {
  if (audioUnlocked) {
    audio.setTimeState(to)
  }
})

// ── Cover Section Animations ─────────────────────
function initCoverAnimations() {
  const seal = document.querySelector('.seal')
  const coverText = document.querySelector('.cover-text')

  if (seal) seal.classList.add('animate')
  if (coverText) {
    setTimeout(() => coverText.classList.add('animate'), 200)
  }
}

// ── Scroll / Section Tracking ────────────────────
const scrollContainer = document.getElementById('scroll-container')
let currentSection = 0

function updateActiveSection() {
  const scrollTop = scrollContainer.scrollTop
  const viewHeight = scrollContainer.clientHeight

  sections.forEach((sec, i) => {
    const top = sec.offsetTop
    if (scrollTop >= top - viewHeight / 2) {
      currentSection = i
    }
  })

  navDots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSection)
  })
}

scrollContainer.addEventListener('scroll', updateActiveSection, { passive: true })

// Nav dot click
navDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.section)
    sections[idx]?.scrollIntoView({ behavior: 'smooth' })
  })
})

// ── Watchlight Init ──────────────────────────────
const watchlightScene = document.getElementById('watchlight-scene')
if (watchlightScene) {
  watchlight.init(watchlightScene)

  // Request gyroscope on first interaction with the scene
  if (features.gyroscope) {
    watchlightScene.addEventListener('touchstart', async () => {
      const granted = await requestGyroscope()
      if (granted) watchlight.enableGyroscope()
    }, { once: true })
  }
}

// ── Station URL Routing ──────────────────────────
const params = new URLSearchParams(window.location.search)
const station = params.get('station')

if (station) {
  // Wait for gate dismissal, then scroll to station
  const targetSection = document.querySelector(`[data-section="${station}"]`)
  if (targetSection) {
    const origDismiss = dismissGate
    audioGate.removeEventListener('touchstart', origDismiss)
    audioGate.removeEventListener('click', origDismiss)

    function gateAndNavigate() {
      dismissGate()
      setTimeout(() => {
        targetSection.scrollIntoView({ behavior: 'smooth' })
      }, 1200) // allow cover animation to play briefly
    }

    audioGate.addEventListener('touchstart', gateAndNavigate, { once: true })
    audioGate.addEventListener('click', gateAndNavigate, { once: true })
  }
}

// ── Citizen Registration ─────────────────────────
const citizenForm = document.getElementById('citizen-form')
const citizenCard = document.getElementById('citizen-card')

if (citizenForm) {
  // Check for existing registration
  const saved = localStorage.getItem('hope-citizen')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      showCitizenCard(data)
    } catch {}
  }

  citizenForm.addEventListener('submit', e => {
    e.preventDefault()
    const name = document.getElementById('citizen-name').value.trim()
    const sector = document.getElementById('citizen-sector').value

    if (!name || !sector) return

    const data = { name, sector, date: 'Year 888 A.Dk.', classification: 'UNPHASED' }
    localStorage.setItem('hope-citizen', JSON.stringify(data))

    haptic.play('formPrint')
    showCitizenCard(data)
  })
}

function showCitizenCard(data) {
  if (!citizenCard) return
  document.getElementById('card-name').textContent = data.name.toUpperCase()
  document.getElementById('card-sector').textContent = data.sector.toUpperCase()
  document.getElementById('card-class').textContent = data.classification
  document.getElementById('card-date').textContent = data.date

  citizenForm.style.display = 'none'
  citizenCard.hidden = false
}

// ── Dev: Expose engines for console testing ──────
if (import.meta.env.DEV) {
  window.HOPE = { timeEngine, audio, watchlight, haptic }
  console.log(
    '%cH.O.P.E. CITIZEN MANUAL',
    'color: #888; font-family: monospace; font-size: 12px; letter-spacing: 4px;'
  )
  console.log(
    '%cDev tools: window.HOPE.timeEngine.force("surge")',
    'color: #555; font-family: monospace; font-size: 10px;'
  )
}
