/**
 * Time-Engine: Real-time atmosphere state machine.
 * Drives CSS custom properties, audio crossfades, and content access.
 *
 * States: MORNING | AFTERNOON | DUSK | NIGHT | SURGE | DAWN
 *
 * Supports URL override: ?zone=surge forces a specific state
 * (for exhibition QR codes placed in specific rooms).
 */

const STATES = ['morning', 'afternoon', 'dusk', 'night', 'surge', 'dawn']

function getTimeState() {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  if (h >= 18 && h < 21) return 'dusk'
  if (h >= 21 || h < 1) return 'night'
  if (h >= 1 && h < 5) return 'surge'
  return 'dawn' // 5-6
}

class TimeEngine {
  constructor() {
    this.state = null
    this.override = null
    this.listeners = []
    this._interval = null
  }

  init() {
    // Check for URL override
    const params = new URLSearchParams(window.location.search)
    const zone = params.get('zone')
    if (zone && STATES.includes(zone)) {
      this.override = zone
    }

    this._update()
    this._interval = setInterval(() => this._update(), 60_000)
  }

  _update() {
    const next = this.override || getTimeState()
    if (next !== this.state) {
      const prev = this.state
      this.state = next
      document.documentElement.dataset.timeState = next
      this.listeners.forEach(fn => fn({ from: prev, to: next }))
    }
  }

  /** Force a specific state (for testing / exhibition) */
  force(state) {
    if (STATES.includes(state)) {
      this.override = state
      this._update()
    }
  }

  /** Clear override, return to real-time */
  release() {
    this.override = null
    this._update()
  }

  on(fn) {
    this.listeners.push(fn)
    return () => { this.listeners = this.listeners.filter(l => l !== fn) }
  }

  destroy() {
    clearInterval(this._interval)
  }
}

export const timeEngine = new TimeEngine()
