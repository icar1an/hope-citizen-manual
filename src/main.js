/**
 * WATCHLIGHT — Desktop Dashboard
 * H.O.P.E. (Human Order and Phase Enforcement)
 *
 * "Cooperation secures a bright morning."
 */

import './style.css'

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  // Countdown cycle duration in milliseconds
  // Real mode: 12 hours (43200000ms)
  // Exhibition mode: 20 minutes (1200000ms)
  cycleDuration: 12 * 60 * 60 * 1000,
  exhibitionDuration: 20 * 60 * 1000,

  // Notification timing
  notificationInterval: { min: 8000, max: 25000 },
  notificationDuration: 6000,

  // State thresholds (percentage of cycle remaining)
  states: {
    day: 0.6,        // 60%+ remaining = day
    transition: 0.3, // 30-60% = transition
    approaching: 0.1, // 10-30% = approaching
    night: 0,        // <10% = night/siren
  },
}

// Check for exhibition mode via URL param
const params = new URLSearchParams(window.location.search)
const isExhibition = params.has('exhibition') || params.get('zone') === 'exhibition'
const cycleDuration = isExhibition ? CONFIG.exhibitionDuration : CONFIG.cycleDuration

// ─── DOM References ──────────────────────────────────────────
const countdownEl = document.getElementById('countdown')
const countdownLabel = document.getElementById('countdown-label')
const obscurationEl = document.getElementById('obscuration')
const notificationEl = document.getElementById('notification')
const notificationTextEl = document.getElementById('notification-text')
const alertBanner = document.getElementById('alert-banner')
const alertText = document.getElementById('alert-text')

// ─── Notification Messages ───────────────────────────────────
function randomSector() {
  return Math.floor(Math.random() * 900) + 1
}

const NOTIFICATIONS = [
  {
    template: () => `Sector ${randomSector()} cleared.\nAll Phased have returned to registered households`,
    type: 'green',
  },
  {
    template: () => `Watchlight HOPE-PC8 Phase Cell distribution complete in Sector ${randomSector()}.`,
    type: 'green',
  },
  {
    template: () => `Morning Return verification completed [Sector ${randomSector()}]. Identification discrepancies not recorded.`,
    type: 'green',
  },
  {
    template: () => `Sector ${randomSector()} cleared again.`,
    type: 'green',
  },
  {
    template: () => 'Siren systems do not malfunction.',
    type: 'yellow',
  },
  {
    template: () => `Missing Phased recorded in Sector ${randomSector()}. Do not attempt verification outside the household.`,
    type: 'yellow',
  },
  {
    template: () => `Missing Phased recorded [${randomSector()}]. Do not attempt verification outside the household.`,
    type: 'yellow',
  },
  {
    template: () => `Return data unavailable for Sector ${Math.floor(Math.random() * 9)}*${Math.floor(Math.random() * 99)}ver.#.`,
    type: 'yellow',
  },
  {
    template: () => 'Return verification pending // pending // pending',
    type: 'yellow',
  },
  {
    template: () => 'Do not open the door.',
    type: 'red',
  },
  {
    template: () => 'The Lost is present. Do not engage.',
    type: 'red',
  },
  {
    template: () => 'The Lost may resemble a known individual. Do not approach. The Lost may use a familiar voice. Do not answer. The Lost may call your name. Do not respond.',
    type: 'red',
  },
]

// ─── Countdown Engine ────────────────────────────────────────
function getTimeRemaining() {
  const now = Date.now()
  const elapsed = now % cycleDuration
  return cycleDuration - elapsed
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getProgress() {
  // Returns 0 (just reset/day) to 1 (siren imminent)
  const remaining = getTimeRemaining()
  return 1 - (remaining / cycleDuration)
}

// ─── State Engine ────────────────────────────────────────────
let currentState = 'day'

function getState(progress) {
  const remaining = 1 - progress
  if (remaining >= CONFIG.states.day) return 'day'
  if (remaining >= CONFIG.states.transition) return 'transition'
  if (remaining >= CONFIG.states.approaching) return 'approaching'
  return 'night'
}

function updateState() {
  const progress = getProgress()
  const newState = getState(progress)

  if (newState !== currentState) {
    currentState = newState
    document.body.setAttribute('data-state', newState)

    // Update countdown label
    if (newState === 'day') {
      countdownLabel.textContent = 'NIGHT SIREN LAUNCH IN'
    } else {
      countdownLabel.textContent = 'NEXT SIREN ACTIVATION'
    }

    // Show/hide alert banner in night state
    if (newState === 'night') {
      showAlertBanner()
    } else {
      hideAlertBanner()
    }
  }

  // Update obscuration percentage (0% at day start, 100% at siren)
  const obscuration = Math.round(progress * 100)
  obscurationEl.textContent = obscuration
}

// ─── Alert Banner ────────────────────────────────────────────
function showAlertBanner() {
  const alerts = NOTIFICATIONS.filter(n => n.type === 'red')
  const alert = alerts[Math.floor(Math.random() * alerts.length)]
  alertText.textContent = alert.template()
  alertBanner.hidden = false
  requestAnimationFrame(() => {
    alertBanner.classList.add('visible')
  })
}

function hideAlertBanner() {
  alertBanner.classList.remove('visible')
  setTimeout(() => {
    alertBanner.hidden = true
  }, 500)
}

// ─── Notification Engine ─────────────────────────────────────
let notificationTimeout = null
let isNotificationVisible = false

function showNotification() {
  if (isNotificationVisible) return

  // Pick a notification based on current state
  let pool
  if (currentState === 'night') {
    pool = NOTIFICATIONS.filter(n => n.type === 'red' || n.type === 'yellow')
  } else if (currentState === 'approaching') {
    pool = NOTIFICATIONS.filter(n => n.type === 'yellow' || n.type === 'green')
  } else {
    pool = NOTIFICATIONS.filter(n => n.type === 'green')
  }

  const notification = pool[Math.floor(Math.random() * pool.length)]
  const text = notification.template()

  // Update notification element
  notificationTextEl.textContent = text
  notificationEl.className = `notification type-${notification.type}`

  // Show with glitch effect
  requestAnimationFrame(() => {
    notificationEl.classList.add('visible', 'glitch')
    isNotificationVisible = true

    // Remove glitch class after animation
    setTimeout(() => {
      notificationEl.classList.remove('glitch')
    }, 900)

    // Hide after duration
    setTimeout(() => {
      notificationEl.classList.remove('visible')
      isNotificationVisible = false
    }, CONFIG.notificationDuration)
  })
}

function scheduleNextNotification() {
  const { min, max } = CONFIG.notificationInterval
  const delay = min + Math.random() * (max - min)
  notificationTimeout = setTimeout(() => {
    showNotification()
    scheduleNextNotification()
  }, delay)
}

// ─── Main Loop ───────────────────────────────────────────────
function tick() {
  const remaining = getTimeRemaining()
  countdownEl.textContent = formatTime(remaining)
  updateState()
  requestAnimationFrame(tick)
}

// ─── Initialize ──────────────────────────────────────────────
function init() {
  // Set initial state
  updateState()
  const remaining = getTimeRemaining()
  countdownEl.textContent = formatTime(remaining)

  // Start the countdown loop
  requestAnimationFrame(tick)

  // Start notification ticker
  scheduleNextNotification()

  // Log mode
  if (isExhibition) {
    console.log('[WATCHLIGHT] Exhibition mode: 20-minute cycle')
  } else {
    console.log('[WATCHLIGHT] Standard mode: 12-hour cycle')
  }
}

init()
