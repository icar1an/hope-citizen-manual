/** Haptic feedback via Vibration API (Android only — iOS has no support) */

const PATTERNS = {
  tap:           [15],
  watchlightOn:  [50],
  watchlightOff: [30],
  lostDetected:  [100, 50, 100, 50, 300],
  sirenPulse:    [200, 100, 200, 100, 200],
  formPrint:     [30, 30, 30, 30, 30],
  sectionSnap:   [10],
}

class HapticEngine {
  constructor() {
    this.supported = 'vibrate' in navigator
  }

  play(name) {
    if (!this.supported) return
    const pattern = PATTERNS[name]
    if (pattern) navigator.vibrate(pattern)
  }

  stop() {
    if (this.supported) navigator.vibrate(0)
  }
}

export const haptic = new HapticEngine()
