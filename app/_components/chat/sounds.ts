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
