/**
 * Procedural Audio Engine — all sounds generated via Web Audio API.
 * No external audio files. Raw synthesized tones fit the institutional aesthetic.
 */

class AudioEngine {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.unlocked = false
    this.activeSounds = new Map()
    this._volume = 0.3
  }

  /** Must be called from a user gesture (tap) */
  unlock() {
    if (this.unlocked) return
    const AC = window.AudioContext || window.webkitAudioContext
    this.ctx = new AC()
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this._volume
    this.masterGain.connect(this.ctx.destination)
    if (this.ctx.state === 'suspended') this.ctx.resume()
    this.unlocked = true
  }

  set volume(v) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.1)
    }
  }

  get volume() { return this._volume }

  /** Stop a named loop */
  stop(name, fadeTime = 1) {
    const sound = this.activeSounds.get(name)
    if (!sound) return
    const { gain, nodes } = sound
    gain.gain.setTargetAtTime(0, this.ctx.currentTime, fadeTime / 3)
    setTimeout(() => {
      nodes.forEach(n => { try { n.stop?.() } catch {} })
      gain.disconnect()
      this.activeSounds.delete(name)
    }, fadeTime * 1000)
  }

  /** Stop all sounds */
  stopAll(fadeTime = 1) {
    for (const name of this.activeSounds.keys()) {
      this.stop(name, fadeTime)
    }
  }

  // ── Sound Generators ───────────────────────────

  /**
   * Ambient day: bandpass-filtered white noise simulating fluorescent hum
   */
  playAmbientDay() {
    if (!this.unlocked) return
    this.stop('ambient')
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.masterGain)

    // White noise source
    const bufferSize = this.ctx.sampleRate * 2
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    // Bandpass around 120Hz (fluorescent hum)
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 120
    bp.Q.value = 8

    noise.connect(bp)
    bp.connect(gain)
    noise.start()

    gain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.5)

    this.activeSounds.set('ambient', { gain, nodes: [noise] })
  }

  /**
   * Ambient dark: brown noise + low drone
   */
  playAmbientDark() {
    if (!this.unlocked) return
    this.stop('ambient')
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.masterGain)

    // Brown noise (integrated white noise)
    const bufferSize = this.ctx.sampleRate * 4
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (last + 0.02 * white) / 1.02
      last = data[i]
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    // Low-pass to make it darker
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 200

    noise.connect(lp)
    lp.connect(gain)
    noise.start()

    // Sub drone at ~40Hz
    const drone = this.ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 40
    const droneGain = this.ctx.createGain()
    droneGain.gain.value = 0.08
    drone.connect(droneGain)
    droneGain.connect(gain)
    drone.start()

    // Slow LFO on drone gain
    const lfo = this.ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.1
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 0.03
    lfo.connect(lfoGain)
    lfoGain.connect(droneGain.gain)
    lfo.start()

    gain.gain.setTargetAtTime(0.25, this.ctx.currentTime, 1)

    this.activeSounds.set('ambient', { gain, nodes: [noise, drone, lfo] })
  }

  /**
   * Surge rumble: sub-bass + noise bursts
   */
  playSurgeRumble() {
    if (!this.unlocked) return
    this.stop('ambient')
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.masterGain)

    // Sub-bass
    const sub = this.ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 30
    const subGain = this.ctx.createGain()
    subGain.gain.value = 0.2
    sub.connect(subGain)
    subGain.connect(gain)
    sub.start()

    // Rumble noise
    const bufferSize = this.ctx.sampleRate * 3
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (last + 0.01 * white) / 1.01
      last = data[i]
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 80
    noise.connect(lp)
    lp.connect(gain)
    noise.start()

    gain.gain.setTargetAtTime(0.35, this.ctx.currentTime, 1.5)

    this.activeSounds.set('ambient', { gain, nodes: [sub, noise] })
  }

  /**
   * Night siren: two detuned sawtooth oscillators with pitch sweep
   */
  playSiren() {
    if (!this.unlocked) return
    this.stop('siren')
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.masterGain)

    const osc1 = this.ctx.createOscillator()
    const osc2 = this.ctx.createOscillator()
    osc1.type = 'sawtooth'
    osc2.type = 'sawtooth'
    osc1.frequency.value = 440
    osc2.frequency.value = 443 // slight detune

    const oscGain = this.ctx.createGain()
    oscGain.gain.value = 0.12
    osc1.connect(oscGain)
    osc2.connect(oscGain)
    oscGain.connect(gain)

    // Pitch sweep LFO
    const lfo = this.ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.25 // one sweep per 4 seconds
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 200 // pitch range
    lfo.connect(lfoGain)
    lfoGain.connect(osc1.frequency)
    lfoGain.connect(osc2.frequency)

    osc1.start()
    osc2.start()
    lfo.start()

    gain.gain.setTargetAtTime(0.15, this.ctx.currentTime, 0.3)

    this.activeSounds.set('siren', { gain, nodes: [osc1, osc2, lfo] })
  }

  /**
   * Morning signal: three ascending tones (C5, E5, G5)
   */
  playMorningSignal() {
    if (!this.unlocked) return
    const gain = this.ctx.createGain()
    gain.gain.value = 0.2
    gain.connect(this.masterGain)

    const freqs = [523.25, 659.25, 783.99] // C5, E5, G5
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      const envGain = this.ctx.createGain()
      envGain.gain.value = 0
      osc.connect(envGain)
      envGain.connect(gain)

      const start = this.ctx.currentTime + i * 0.25
      osc.start(start)
      envGain.gain.setValueAtTime(0, start)
      envGain.gain.linearRampToValueAtTime(0.3, start + 0.05)
      envGain.gain.exponentialRampToValueAtTime(0.001, start + 0.8)
      osc.stop(start + 0.9)
    })
  }

  /**
   * Watchlight activation: click + rising hum
   */
  playWatchlightOn() {
    if (!this.unlocked) return
    const gain = this.ctx.createGain()
    gain.gain.value = 0.15
    gain.connect(this.masterGain)

    // Click (noise burst)
    const clickBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.02, this.ctx.sampleRate)
    const clickData = clickBuf.getChannelData(0)
    for (let i = 0; i < clickData.length; i++) clickData[i] = Math.random() * 2 - 1

    const click = this.ctx.createBufferSource()
    click.buffer = clickBuf
    const clickGain = this.ctx.createGain()
    clickGain.gain.value = 0.4
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2000
    bp.Q.value = 3
    click.connect(bp)
    bp.connect(clickGain)
    clickGain.connect(gain)
    click.start()

    // Rising hum
    const hum = this.ctx.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 800
    hum.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.2)
    const humGain = this.ctx.createGain()
    humGain.gain.value = 0
    humGain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.15)
    humGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.5)
    hum.connect(humGain)
    humGain.connect(gain)
    hum.start()
    hum.stop(this.ctx.currentTime + 0.6)
  }

  /**
   * Lost detection: white noise burst with distortion
   */
  playLostDetected() {
    if (!this.unlocked) return
    const gain = this.ctx.createGain()
    gain.gain.value = 0.25
    gain.connect(this.masterGain)

    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
      // Crude bitcrush: quantize
      data[i] = Math.round(data[i] * 4) / 4
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buf
    const envGain = this.ctx.createGain()
    envGain.gain.value = 0
    envGain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.02)
    envGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4)
    noise.connect(envGain)
    envGain.connect(gain)
    noise.start()
  }

  /**
   * Update ambient sound based on time state
   */
  setTimeState(state) {
    if (!this.unlocked) return
    switch (state) {
      case 'morning':
      case 'afternoon':
        this.playAmbientDay()
        this.stop('siren')
        break
      case 'dusk':
      case 'night':
        this.playAmbientDark()
        this.stop('siren')
        break
      case 'surge':
        this.playSurgeRumble()
        this.playSiren()
        break
      case 'dawn':
        this.playAmbientDay()
        this.stop('siren')
        this.playMorningSignal()
        break
    }
  }
}

export const audio = new AudioEngine()
