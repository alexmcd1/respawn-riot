// AIM-style chime synthesis via Web Audio API.
//
// We don't ship the original AIM sound (copyrighted) — instead, we
// synthesize a tiny "door open + chime" using two oscillators with an
// exponential decay envelope. Lightweight (no audio asset), works
// offline, and the user can later replace with a real sample by
// dropping /public/sounds/door.mp3 + tweaking playDoorOpen() to prefer
// the file.

let _ctx: AudioContext | null = null
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (_ctx) return _ctx
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    _ctx = new Ctor()
    return _ctx
  } catch {
    return null
  }
}

/** A short "door open" chime — two stacked sine tones, descending then
 *  ascending, with a quick exponential decay. */
export function playDoorOpen(): void {
  const ac = ctx()
  if (!ac) return
  // Browsers suspend audio context until first user gesture. If still
  // suspended, resume() is best-effort — first ding may swallow until
  // the user interacts once.
  if (ac.state === 'suspended') {
    void ac.resume().catch(() => {})
  }

  const now = ac.currentTime
  const masterGain = ac.createGain()
  masterGain.gain.value = 0.15 // keep it polite
  masterGain.connect(ac.destination)

  // First tone — a quick "creak"
  tone({ ac, dest: masterGain, freq: 440, start: now,        duration: 0.18, type: 'sine' })
  tone({ ac, dest: masterGain, freq: 587.33, start: now + 0.06, duration: 0.18, type: 'sine' })
  // Second tone — a higher "ding"
  tone({ ac, dest: masterGain, freq: 880,   start: now + 0.20, duration: 0.28, type: 'sine' })
  tone({ ac, dest: masterGain, freq: 1318.5, start: now + 0.20, duration: 0.28, type: 'triangle', gain: 0.4 })
}

/** A softer blip for incoming-message alerts. */
export function playMessagePing(): void {
  const ac = ctx()
  if (!ac) return
  if (ac.state === 'suspended') void ac.resume().catch(() => {})
  const now = ac.currentTime
  const masterGain = ac.createGain()
  masterGain.gain.value = 0.10
  masterGain.connect(ac.destination)
  tone({ ac, dest: masterGain, freq: 988, start: now,        duration: 0.10, type: 'sine' })
  tone({ ac, dest: masterGain, freq: 1318.5, start: now + 0.05, duration: 0.14, type: 'sine' })
}

/** Festive confetti burst — ascending major triad with a quick sparkle
 *  on top. Used by the "message from our sponsor" easter egg. */
export function playConfetti(): void {
  const ac = ctx()
  if (!ac) return
  if (ac.state === 'suspended') void ac.resume().catch(() => {})
  const now = ac.currentTime
  const masterGain = ac.createGain()
  masterGain.gain.value = 0.13
  masterGain.connect(ac.destination)

  // Ascending C-major arpeggio (C5, E5, G5, C6) — short, snappy
  tone({ ac, dest: masterGain, freq: 523.25, start: now,        duration: 0.18, type: 'triangle' })
  tone({ ac, dest: masterGain, freq: 659.25, start: now + 0.06, duration: 0.18, type: 'triangle' })
  tone({ ac, dest: masterGain, freq: 783.99, start: now + 0.12, duration: 0.22, type: 'triangle' })
  tone({ ac, dest: masterGain, freq: 1046.5, start: now + 0.18, duration: 0.30, type: 'sine' })

  // Sparkle layer — high random-ish chime cluster a beat later
  tone({ ac, dest: masterGain, freq: 1568, start: now + 0.32, duration: 0.20, type: 'sine', gain: 0.55 })
  tone({ ac, dest: masterGain, freq: 2093, start: now + 0.40, duration: 0.18, type: 'sine', gain: 0.45 })
  tone({ ac, dest: masterGain, freq: 2637, start: now + 0.48, duration: 0.16, type: 'sine', gain: 0.35 })
}

function tone({
  ac,
  dest,
  freq,
  start,
  duration,
  type = 'sine',
  gain = 1,
}: {
  ac: AudioContext
  dest: AudioNode
  freq: number
  start: number
  duration: number
  type?: OscillatorType
  gain?: number
}): void {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = 0
  // Quick attack then exponential decay — gives it a chime-ish character
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(g)
  g.connect(dest)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}
