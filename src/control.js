import './control.css'

const CONFIRM_HOLD_MS = 2000

const CONFIRMS = {
  green: {
    checks: '☐ Identity visually confirmed\n☐ Watchlight verification completed',
    icon: 'check',
  },
  yellow: {
    checks: '☐ Individual did not return after Morning Signal\n☐ No external search conducted',
    icon: 'exclaim',
  },
  red: {
    checks: '☐ Subject observed outside residence\n☐ No contact initiated\n☐ H.O.P.E. Action Needed',
    icon: 'warning',
  },
}

const GLITCH_VARIANTS = [{ checks: '☐ Are you Lost?' }, { checks: '☐ We will find you.' }]

const GLITCH_CHANCE = 1 / 3

function resolveConfig(level) {
  if (level === 'red' && Math.random() < GLITCH_CHANCE) {
    const v = GLITCH_VARIANTS[Math.floor(Math.random() * GLITCH_VARIANTS.length)]
    return { ...v, glitch: true }
  }
  return CONFIRMS[level]
}

const ICON_SVG = {
  check: `
    <div class="confirm-icon--disc" style="width:83px;height:83px;display:flex;align-items:center;justify-content:center;">
      <svg width="45" height="37" viewBox="0 0 45 37" fill="none" aria-hidden="true">
        <path d="M5 18 L18 31 L40 5" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`,
  exclaim: `
    <div class="confirm-icon--disc" style="width:83px;height:83px;display:flex;align-items:center;justify-content:center;">
      <svg width="14" height="52" viewBox="0 0 14 52" fill="none" aria-hidden="true">
        <rect x="3" y="0" width="8" height="36" rx="2" fill="#fff"/>
        <circle cx="7" cy="46" r="5" fill="#fff"/>
      </svg>
    </div>`,
  warning: `
    <svg width="83" height="83" viewBox="0 0 83 83" fill="none" aria-hidden="true">
      <circle cx="41.5" cy="41.5" r="39" stroke="#000" stroke-width="3"/>
      <path d="M24 32 L41.5 22 L59 32 L59 52 L41.5 62 L24 52 Z" stroke="#000" stroke-width="2.5" fill="none"/>
      <path d="M30 42 L40 36 L50 42" stroke="#000" stroke-width="2" fill="none"/>
      <circle cx="38" cy="42" r="1.5" fill="#000"/>
      <circle cx="44" cy="42" r="1.5" fill="#000"/>
      <path d="M55 55 L64 66" stroke="#000" stroke-width="3" stroke-linecap="round"/>
      <path d="M64 60 L64 70 L74 70" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
}

const buttons = document.querySelectorAll('.report-btn')
const toastEl = document.getElementById('toast')
const confirmEl = document.getElementById('confirm')
const confirmChecksEl = document.getElementById('confirm-checks')
const confirmIconEl = document.getElementById('confirm-icon')

let toastTimer = null
function showToast(message, kind = 'ok') {
  toastEl.textContent = message
  toastEl.dataset.kind = kind
  toastEl.hidden = false
  requestAnimationFrame(() => toastEl.classList.add('visible'))
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('visible')
    setTimeout(() => {
      toastEl.hidden = true
    }, 300)
  }, 1800)
}

function showConfirm(cfg) {
  if (!cfg) return
  confirmEl.classList.toggle('confirm--glitch', !!cfg.glitch)
  confirmChecksEl.textContent = cfg.checks
  confirmIconEl.innerHTML = cfg.glitch ? '' : ICON_SVG[cfg.icon]
  confirmEl.hidden = false
  requestAnimationFrame(() => confirmEl.classList.add('visible'))
}

function hideConfirm() {
  confirmEl.classList.remove('visible')
  setTimeout(() => {
    confirmEl.hidden = true
    confirmEl.classList.remove('confirm--glitch')
    confirmChecksEl.textContent = ''
    confirmIconEl.innerHTML = ''
  }, 240)
}

async function sendLevel(level) {
  const res = await fetch('/api/banner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level }),
  })
  if (!res.ok) throw new Error(`server responded ${res.status}`)
  return res.json()
}

function lockButtons(locked) {
  buttons.forEach((b) => (b.disabled = locked))
}

buttons.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const level = btn.dataset.level
    if (!level) return
    lockButtons(true)
    showConfirm(resolveConfig(level))

    try {
      await sendLevel(level)
    } catch (err) {
      console.error('[control] send failed', err)
      showToast('Transmission failed — retry', 'error')
    }

    setTimeout(() => {
      hideConfirm()
      lockButtons(false)
    }, CONFIRM_HOLD_MS)
  })
})
