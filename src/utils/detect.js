/** Feature detection for device capabilities */

export const features = {
  touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  vibration: 'vibrate' in navigator,
  gyroscope: 'DeviceOrientationEvent' in window,
  webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}

/**
 * Request gyroscope permission (required on iOS 13+).
 * Returns true if granted.
 */
export async function requestGyroscope() {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceOrientationEvent.requestPermission()
      return perm === 'granted'
    } catch {
      return false
    }
  }
  // Android / desktop — automatic
  return features.gyroscope
}
