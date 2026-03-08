/**
 * Watchlight Engine: Touch-driven flashlight beam simulation.
 *
 * The user's finger (or mouse) controls a circular beam of light
 * rendered on a canvas. The beam reveals figures hidden in darkness
 * and classifies them as Unphased, Lucid, or Lost.
 */

import { haptic } from './haptic-engine.js'
import { audio } from './audio-engine.js'

const BEAM_RADIUS = 90
const HOLD_DELAY = 300 // ms before beam activates (prevents accidental scroll triggers)
const FLICKER_RANGE = 4

class WatchlightEngine {
  constructor() {
    this.scene = null
    this.canvas = null
    this.ctx = null
    this.figures = []
    this.active = false
    this.beamX = 0
    this.beamY = 0
    this.holdTimer = null
    this.animFrame = null
    this.gyroOffsetX = 0
    this.gyroOffsetY = 0
    this.gyroEnabled = false
  }

  init(sceneEl) {
    this.scene = sceneEl
    this.canvas = sceneEl.querySelector('.watchlight-canvas')
    this.ctx = this.canvas.getContext('2d')

    // Collect figure elements
    this.figures = [...sceneEl.querySelectorAll('.wl-figure')].map(el => ({
      el,
      classification: el.dataset.class,
      revealed: false,
    }))

    this._resize()
    window.addEventListener('resize', () => this._resize())

    // Touch events
    this.scene.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false })
    this.scene.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false })
    this.scene.addEventListener('touchend', () => this._deactivate())
    this.scene.addEventListener('touchcancel', () => this._deactivate())

    // Mouse fallback for desktop testing
    this.scene.addEventListener('mousedown', e => this._onMouseDown(e))
    this.scene.addEventListener('mousemove', e => this._onMouseMove(e))
    this.scene.addEventListener('mouseup', () => this._deactivate())
    this.scene.addEventListener('mouseleave', () => this._deactivate())
  }

  enableGyroscope() {
    this.gyroEnabled = true
    window.addEventListener('deviceorientation', e => {
      // gamma: left-right tilt (-90 to 90)
      // beta: front-back tilt (-180 to 180)
      this.gyroOffsetX = (e.gamma / 90) * 30
      this.gyroOffsetY = ((e.beta - 45) / 90) * 20 // center around 45deg (natural hold angle)
    })
  }

  _resize() {
    const rect = this.scene.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio, 2) // cap at 2x for perf
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.ctx.scale(dpr, dpr)
    this.sceneRect = rect
  }

  _getRelPos(clientX, clientY) {
    const rect = this.sceneRect || this.scene.getBoundingClientRect()
    return {
      x: clientX - rect.left + this.gyroOffsetX,
      y: clientY - rect.top + this.gyroOffsetY,
    }
  }

  _onTouchStart(e) {
    e.preventDefault()
    const t = e.touches[0]
    const pos = this._getRelPos(t.clientX, t.clientY)
    this.beamX = pos.x
    this.beamY = pos.y

    // Delayed activation to prevent scroll conflicts
    this.holdTimer = setTimeout(() => {
      this._activate()
    }, HOLD_DELAY)
  }

  _onTouchMove(e) {
    e.preventDefault()
    const t = e.touches[0]
    const pos = this._getRelPos(t.clientX, t.clientY)
    this.beamX = pos.x
    this.beamY = pos.y

    if (!this.active && this.holdTimer) {
      // If finger moves too much during hold delay, cancel
      clearTimeout(this.holdTimer)
      this.holdTimer = null
    }
  }

  _onMouseDown(e) {
    const pos = this._getRelPos(e.clientX, e.clientY)
    this.beamX = pos.x
    this.beamY = pos.y
    this._activate()
  }

  _onMouseMove(e) {
    if (!this.active) return
    const pos = this._getRelPos(e.clientX, e.clientY)
    this.beamX = pos.x
    this.beamY = pos.y
  }

  _activate() {
    if (this.active) return
    this.active = true
    this.scene.classList.add('beam-active')
    haptic.play('watchlightOn')
    audio.playWatchlightOn()
    this._render()
  }

  _deactivate() {
    clearTimeout(this.holdTimer)
    this.holdTimer = null
    if (!this.active) return
    this.active = false
    this.scene.classList.remove('beam-active')
    haptic.play('watchlightOff')

    // Clear canvas
    if (this.ctx) {
      const w = this.canvas.width / Math.min(window.devicePixelRatio, 2)
      const h = this.canvas.height / Math.min(window.devicePixelRatio, 2)
      this.ctx.clearRect(0, 0, w, h)
    }

    // Reset figure reveals
    this.figures.forEach(f => {
      f.el.classList.remove('revealed')
      f.revealed = false
    })

    cancelAnimationFrame(this.animFrame)
  }

  _render() {
    if (!this.active) return

    const w = this.sceneRect.width
    const h = this.sceneRect.height
    const ctx = this.ctx

    ctx.clearRect(0, 0, w, h)

    // Beam with flicker
    const flicker = (Math.random() - 0.5) * FLICKER_RANGE
    const r = BEAM_RADIUS + flicker

    // Draw the "light" — this is a bright spot that reveals what's beneath
    // We'll draw a dark overlay with a hole cut out for the beam
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)'
    ctx.fillRect(0, 0, w, h)

    // Cut out the beam circle
    ctx.globalCompositeOperation = 'destination-out'
    const grad = ctx.createRadialGradient(this.beamX, this.beamY, 0, this.beamX, this.beamY, r)
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)')
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(this.beamX, this.beamY, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Check figure proximity
    this._checkFigures()

    this.animFrame = requestAnimationFrame(() => this._render())
  }

  _checkFigures() {
    this.figures.forEach(fig => {
      const rect = fig.el.getBoundingClientRect()
      const sceneRect = this.sceneRect
      const figCX = rect.left - sceneRect.left + rect.width / 2
      const figCY = rect.top - sceneRect.top + rect.height / 2
      const dist = Math.hypot(figCX - this.beamX, figCY - this.beamY)

      const inBeam = dist < BEAM_RADIUS + 20

      if (inBeam && !fig.revealed) {
        fig.revealed = true
        fig.el.classList.add('revealed')

        if (fig.classification === 'lost') {
          haptic.play('lostDetected')
          audio.playLostDetected()
        }
      } else if (!inBeam && fig.revealed) {
        fig.revealed = false
        fig.el.classList.remove('revealed')
      }
    })
  }

  destroy() {
    this._deactivate()
    // Listeners cleaned up by GC since scene element will be removed
  }
}

export const watchlight = new WatchlightEngine()
