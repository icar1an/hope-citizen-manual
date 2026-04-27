/**
 * WATCHLIGHT — Desktop Dashboard
 * H.O.P.E. (Human Order and Phase Enforcement)
 *
 * "Cooperation secures a bright morning."
 */

import './style.css'

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  cycleDuration: 12 * 60 * 60 * 1000, // 12 hours
  exhibitionDuration: 20 * 60 * 1000, // 20 minutes

  // Intro timing
  introHold: 3000, // Hold landing text for 3s
  introScrollDuration: 3000, // Auto-scroll transition duration

  notificationInterval: { min: 10000, max: 30000 },
  notificationDuration: 6000,

  // Siren — fires on a fixed wall-clock interval, independent of user input.
  // Controlled only here; not exposed to mobile controllers.
  sirenIntervalMs: 10 * 60 * 1000, // 10 minutes
  sirenDurationMs: 5000,

  // Warning flash (periodic black flash with alert)
  warningFlashInterval: { min: 60000, max: 180000 },
  warningFlashIntervalExhibition: { min: 20000, max: 45000 },
  warningFlashDuration: 5000,

  // State thresholds (percentage of cycle remaining)
  states: {
    day: 0.6,
    transition: 0.3,
    approaching: 0.1,
    night: 0,
  },
}

// Check for exhibition mode
const params = new URLSearchParams(window.location.search)
const isExhibition = params.has('exhibition') || params.get('zone') === 'exhibition'
const cycleDuration = isExhibition ? CONFIG.exhibitionDuration : CONFIG.cycleDuration

// ─── DOM References ──────────────────────────────────────────
const loader = document.getElementById('loader')
const dashboard = document.getElementById('dashboard')
const countdownEl = document.getElementById('countdown')
const obscurationEl = document.getElementById('obscuration')
const notificationEl = document.getElementById('notification')
const notificationTextEl = document.getElementById('notification-text')
const alertBanner = document.getElementById('alert-banner')
const alertText = document.getElementById('alert-text')
const alertIconImg = alertBanner?.querySelector('.alert-icon img')
const ALERT_ICON_WARNING = './assets/warning.svg'
const ALERT_ICON_AGENT = './assets/agent.svg'
const logo = document.getElementById('logo')
const statusInfo = document.getElementById('status-info')

// ─── Notification Messages ───────────────────────────────────
function randomSector() {
  return Math.floor(Math.random() * 900) + 1
}

const NOTIFICATIONS = [
  // Green — safe / cleared
  {
    template: () => `Sector ${randomSector()} cleared.\nAll Phased have returned to registered households`,
    type: 'green',
  },
  {
    template: () => `Watchlight HOPE-PC8 Phase Cell distribution complete in Sector ${randomSector()}.`,
    type: 'green',
  },
  {
    template: () =>
      `Morning Return verification completed [Sector ${randomSector()}]. Identification discrepancies not recorded.`,
    type: 'green',
  },
  { template: () => `Sector ${randomSector()} cleared again.`, type: 'green' },
  { template: () => 'Siren systems do not malfunction.', type: 'green' },
  // Yellow — minor warnings
  {
    template: () =>
      `Report logged. This sector [${randomSector()}] has existing missing records.`,
    type: 'yellow',
  },
  {
    template: () =>
      `Missing Phased recorded in Sector ${randomSector()}. Do not attempt verification outside the household.`,
    type: 'yellow',
  },
  {
    template: () => `Missing Phased recorded [${randomSector()}]. Do not attempt verification outside the household.`,
    type: 'yellow',
  },
  // Dark — serious warnings
  {
    template: () =>
      `Return data unavailable for Sector ${Math.floor(Math.random() * 9)}*${Math.floor(Math.random() * 99)}ver.#.`,
    type: 'dark',
  },
  { template: () => 'Return verification pending // pending // pending', type: 'dark' },
  { template: () => 'Do not open the door.', type: 'dark' },
  { template: () => 'If I wish on a half moon will only half of my wish come true?', type: 'dark' },
  // Red — danger / Lost
  { template: () => 'The Lost is present. Do not engage.', type: 'red' },
  {
    template: () =>
      'The Lost may resemble a known individual. Do not approach. The Lost may use a familiar voice. Do not answer. The Lost may call your name. Do not respond.',
    type: 'red',
  },
  { template: () => 'Recognition of the Lost does not indicate recovery.', type: 'red' },
  { template: () => 'This Lost has been recorded before.', type: 'red' },
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
  const remaining = getTimeRemaining()
  return 1 - remaining / cycleDuration
}

// ─── State Engine ────────────────────────────────────────────
let currentState = 'day'
let isWarningFlash = false

function getState(progress) {
  const remaining = 1 - progress
  if (remaining >= CONFIG.states.day) return 'day'
  if (remaining >= CONFIG.states.transition) return 'transition'
  if (remaining >= CONFIG.states.approaching) return 'approaching'
  return 'night'
}

function updateState() {
  if (isWarningFlash) return // Don't override during warning flash

  const progress = getProgress()
  const newState = getState(progress)

  if (newState !== currentState) {
    currentState = newState
    document.body.setAttribute('data-state', newState)

    // Show logo + status in all states after intro
    logo.classList.add('visible')
    statusInfo.classList.add('visible')

    // Show alert in night state
    if (newState === 'night') {
      showAlertBanner()
    } else {
      hideAlertBanner()
    }
  }

  // Update obscuration percentage
  const obscuration = Math.round(progress * 100)
  obscurationEl.textContent = obscuration
}

// ─── Alert Banner ────────────────────────────────────────────
// `source` is 'state' (driven by the cycle state machine) or 'control'
// (driven by a mobile button press via the Worker/DO). Control pushes
// take priority and aren't clobbered by state transitions.
let bannerSource = null
let controlClearTimer = null

function showAlertBanner() {
  if (bannerSource === 'control') return
  const alerts = NOTIFICATIONS.filter((n) => n.type === 'red')
  const alert = alerts[Math.floor(Math.random() * alerts.length)]
  alertText.textContent = alert.template()
  alertBanner.removeAttribute('data-banner-level')
  if (alertIconImg) alertIconImg.src = ALERT_ICON_WARNING
  alertBanner.hidden = false
  bannerSource = 'state'
  requestAnimationFrame(() => {
    alertBanner.classList.add('visible')
  })
}

function hideAlertBanner() {
  if (bannerSource === 'control') return
  alertBanner.classList.remove('visible')
  bannerSource = null
  setTimeout(() => {
    if (!bannerSource) alertBanner.hidden = true
  }, 500)
}

function showControlledBanner(level, message) {
  clearTimeout(controlClearTimer)
  alertText.textContent = message
  alertBanner.dataset.bannerLevel = level
  if (alertIconImg) alertIconImg.src = ALERT_ICON_AGENT
  alertBanner.hidden = false
  bannerSource = 'control'
  alertBanner.classList.remove('glitch')
  requestAnimationFrame(() => {
    alertBanner.classList.add('visible', 'glitch')
  })
  setTimeout(() => alertBanner.classList.remove('glitch'), 900)
}

function clearControlledBanner() {
  if (bannerSource !== 'control') return
  alertBanner.classList.remove('visible')
  bannerSource = null
  controlClearTimer = setTimeout(() => {
    alertBanner.removeAttribute('data-banner-level')
    if (alertIconImg) alertIconImg.src = ALERT_ICON_WARNING
    alertBanner.hidden = true
    if (currentState === 'night') showAlertBanner()
  }, 500)
}

// ─── Warning Flash Engine ────────────────────────────────────
// Periodically flash screen to night/black with yellow globe + red alert
function triggerWarningFlash() {
  if (isWarningFlash) return
  if (currentState === 'night' || currentState === 'approaching') return

  const savedState = currentState
  isWarningFlash = true

  // Flash to night state
  document.body.setAttribute('data-state', 'night')
  showAlertBanner()

  // Restore after duration
  setTimeout(() => {
    isWarningFlash = false
    document.body.setAttribute('data-state', savedState)
    hideAlertBanner()
  }, CONFIG.warningFlashDuration)
}

function scheduleWarningFlash() {
  const interval = isExhibition ? CONFIG.warningFlashIntervalExhibition : CONFIG.warningFlashInterval
  const delay = interval.min + Math.random() * (interval.max - interval.min)
  setTimeout(() => {
    triggerWarningFlash()
    scheduleWarningFlash()
  }, delay)
}

// ─── Notification Engine ─────────────────────────────────────
let isNotificationVisible = false

function showNotification() {
  if (isNotificationVisible) return

  const activeState = isWarningFlash ? 'night' : currentState
  let pool
  if (activeState === 'night') {
    pool = NOTIFICATIONS.filter((n) => n.type === 'red' || n.type === 'dark')
  } else if (activeState === 'approaching') {
    pool = NOTIFICATIONS.filter((n) => n.type === 'dark' || n.type === 'yellow')
  } else if (activeState === 'transition') {
    pool = NOTIFICATIONS.filter((n) => n.type === 'yellow' || n.type === 'green')
  } else {
    pool = NOTIFICATIONS.filter((n) => n.type === 'green' || n.type === 'yellow')
  }

  const notification = pool[Math.floor(Math.random() * pool.length)]
  const text = notification.template()

  notificationTextEl.textContent = text
  notificationEl.className = `notification type-${notification.type}`

  requestAnimationFrame(() => {
    notificationEl.classList.add('visible', 'glitch')
    isNotificationVisible = true

    setTimeout(() => notificationEl.classList.remove('glitch'), 900)

    setTimeout(() => {
      notificationEl.classList.remove('visible')
      isNotificationVisible = false
    }, CONFIG.notificationDuration)
  })
}

function scheduleNextNotification() {
  const { min, max } = CONFIG.notificationInterval
  const delay = min + Math.random() * (max - min)
  setTimeout(() => {
    showNotification()
    scheduleNextNotification()
  }, delay)
}

// ─── Siren (fixed-interval, client-local) ────────────────────
const sirenAudio = document.getElementById('siren')
let sirenUnlocked = false

function unlockSirenAudio() {
  if (sirenUnlocked || !sirenAudio) return
  sirenUnlocked = true
  // Play + immediately pause on the first user gesture so subsequent
  // programmatic .play() calls satisfy autoplay policies.
  sirenAudio.muted = true
  sirenAudio
    .play()
    .then(() => {
      sirenAudio.pause()
      sirenAudio.currentTime = 0
      sirenAudio.muted = false
    })
    .catch(() => {
      sirenAudio.muted = false
    })
}

function fireSiren() {
  if (sirenAudio) {
    try {
      sirenAudio.currentTime = 0
      const playPromise = sirenAudio.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => console.warn('[siren] play blocked', err))
      }
    } catch (err) {
      console.warn('[siren] play threw', err)
    }
  }
  triggerWarningFlash()
}

function scheduleSiren() {
  const now = Date.now()
  const msUntilNext = CONFIG.sirenIntervalMs - (now % CONFIG.sirenIntervalMs)
  setTimeout(() => {
    fireSiren()
    setInterval(fireSiren, CONFIG.sirenIntervalMs)
  }, msUntilNext)
}

// ─── Banner Sync (WebSocket to Durable Object) ───────────────
let bannerSocket = null
let bannerBackoffMs = 500
const BANNER_BACKOFF_MAX_MS = 15_000

function handleBannerMessage(raw) {
  let msg
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }
  if (msg.type === 'banner' && msg.level && msg.message) {
    showControlledBanner(msg.level, msg.message)
  } else if (msg.type === 'clear') {
    clearControlledBanner()
  }
}

function connectBannerSocket() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${proto}//${location.host}/api/ws`
  let ws
  try {
    ws = new WebSocket(url)
  } catch (err) {
    console.warn('[banner] ws construction failed', err)
    scheduleBannerReconnect()
    return
  }
  bannerSocket = ws

  ws.addEventListener('open', () => {
    bannerBackoffMs = 500
    console.log('[banner] ws open →', url)
  })
  ws.addEventListener('message', (ev) => {
    console.log('[banner] ws message', ev.data)
    handleBannerMessage(ev.data)
  })
  ws.addEventListener('close', (ev) => {
    console.log('[banner] ws close', ev.code, ev.reason)
    bannerSocket = null
    scheduleBannerReconnect()
  })
  ws.addEventListener('error', () => {
    console.warn('[banner] ws error')
    try {
      ws.close()
    } catch {
      // ignore
    }
  })
}

function scheduleBannerReconnect() {
  const delay = bannerBackoffMs
  bannerBackoffMs = Math.min(bannerBackoffMs * 2, BANNER_BACKOFF_MAX_MS)
  setTimeout(connectBannerSocket, delay)
}

async function rehydrateBannerState() {
  try {
    const res = await fetch('/api/state')
    if (!res.ok) return
    const { banner } = await res.json()
    if (banner && banner.level && banner.message) {
      showControlledBanner(banner.level, banner.message)
    }
  } catch {
    // ignore; WS will deliver future updates
  }
}

// ─── Main Loop ───────────────────────────────────────────────
function tick() {
  const remaining = getTimeRemaining()
  countdownEl.textContent = formatTime(remaining)
  updateState()
  requestAnimationFrame(tick)
}

// ─── Intro Sequence ──────────────────────────────────────────
// Phase A: Dark landing — globe visible, text fades in (CSS animations)
// Phase B: Hold for introHold duration
// Phase C: Auto-scroll — globe rises, bg transitions dark→light, text fades out
// Phase D: Dashboard revealed
function runIntroSequence() {
  return new Promise((resolve) => {
    // Wait for fonts to load, then hold the landing screen
    Promise.all([document.fonts.ready, new Promise((r) => setTimeout(r, CONFIG.introHold))]).then(() => {
      // Fade out the loader to reveal dashboard
      loader.classList.add('fade-out')
      setTimeout(() => {
        loader.style.display = 'none'
        resolve()
      }, 800)
    })
  })
}

// ─── Initialize ──────────────────────────────────────────────
async function init() {
  // Capture the first user gesture to unlock siren audio playback.
  const gestureEvents = ['pointerdown', 'touchstart', 'keydown']
  const onFirstGesture = () => {
    unlockSirenAudio()
    gestureEvents.forEach((ev) => window.removeEventListener(ev, onFirstGesture))
  }
  gestureEvents.forEach((ev) => window.addEventListener(ev, onFirstGesture, { once: true, passive: true }))

  // Run dark landing → auto-scroll intro
  await runIntroSequence()

  // Reveal dashboard and show elements
  dashboard.classList.add('visible')
  updateState()
  logo.classList.add('visible')
  statusInfo.classList.add('visible')

  const remaining = getTimeRemaining()
  countdownEl.textContent = formatTime(remaining)

  // Start countdown
  requestAnimationFrame(tick)

  // Start notifications after a short delay
  setTimeout(() => scheduleNextNotification(), 5000)

  // Start periodic warning flashes
  setTimeout(() => scheduleWarningFlash(), 15000)

  // Connect to the banner DO so mobile button presses can drive the banner
  rehydrateBannerState()
  connectBannerSocket()

  // Schedule the siren on its fixed interval
  scheduleSiren()

  if (isExhibition) {
    console.log('[WATCHLIGHT] Exhibition mode: 20-minute cycle')
  } else {
    console.log('[WATCHLIGHT] Standard mode: 12-hour cycle')
  }
}

init()
