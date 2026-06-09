// Web Audio sound effects + canvas confetti for QuestList.
// Ported from public/games/questlist/index.html with the same tone
// designs (complete = ascending C-E-G triad, add = perfect fifth,
// delete = fifth-down sawtooth, levelup = arpeggio, achievement =
// stacked sine triplet, click = quick square, pencil = procedural
// grain-based scratch).
//
// The hook stores an AudioContext per component instance and gates
// playback on `enabled` so muting from Settings is just a re-render
// with the same hook.

import { useCallback, useRef } from "react";

type SoundName =
  | "complete"
  | "add"
  | "delete"
  | "levelup"
  | "achievement"
  | "click"
  | "pencil";

export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const tone = useCallback(
    (
      freq: number,
      dur = 0.14,
      type: OscillatorType = "sine",
      gain = 0.08,
      when = 0,
    ) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    [enabled, getCtx],
  );

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      switch (name) {
        case "complete":
          tone(880, 0.10, "sine", 0.10, 0);
          tone(1175, 0.14, "sine", 0.09, 0.06);
          tone(1568, 0.18, "triangle", 0.07, 0.14);
          break;
        case "add":
          tone(660, 0.08, "triangle", 0.06, 0);
          tone(880, 0.08, "triangle", 0.05, 0.05);
          break;
        case "delete":
          tone(320, 0.10, "sawtooth", 0.05, 0);
          tone(220, 0.14, "sawtooth", 0.05, 0.08);
          break;
        case "levelup":
          tone(523, 0.12, "triangle", 0.09, 0);
          tone(659, 0.12, "triangle", 0.09, 0.10);
          tone(784, 0.14, "triangle", 0.09, 0.22);
          tone(1046, 0.22, "triangle", 0.10, 0.36);
          break;
        case "achievement":
          tone(700, 0.10, "sine", 0.08, 0);
          tone(900, 0.10, "sine", 0.08, 0.08);
          tone(1200, 0.16, "sine", 0.09, 0.18);
          break;
        case "click":
          tone(500, 0.04, "square", 0.03, 0);
          break;
        case "pencil": {
          // Procedural pencil-on-paper. Buffer of grain-based noise
          // (each "grain" = one micro-scratch), shaped by an attack/
          // release envelope and a slow pressure undulation, routed
          // through two bandpass filters (graphite friction sweep +
          // wooden body resonance) plus a high-shelf roll-off.
          const bufferDur = 0.62;
          const sr = ctx.sampleRate;
          const len = Math.floor(sr * bufferDur);
          const buf = ctx.createBuffer(1, len, sr);
          const d = buf.getChannelData(0);
          let grainPos = 0, grainLen = 0, grainAmp = 0;
          for (let i = 0; i < len; i++) {
            if (grainPos >= grainLen) {
              grainPos = 0;
              grainLen = 3 + Math.floor(Math.random() * 28);
              grainAmp = 0.25 + Math.random() * 0.75;
            }
            const grainEnv = Math.sin((Math.PI * grainPos) / grainLen);
            grainPos++;
            const t = i / len;
            const attack = Math.min(1, t * 20);
            const release = Math.min(1, (1 - t) * 12);
            const env = Math.min(attack, release);
            const press = 0.55 + 0.45 * Math.sin(t * Math.PI * 5.3 + Math.sin(t * Math.PI * 11.7));
            const white = Math.random() * 2 - 1;
            d[i] = white * grainAmp * grainEnv * env * press * 0.55;
          }
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const bpFric = ctx.createBiquadFilter();
          bpFric.type = "bandpass";
          bpFric.Q.value = 1.3;
          const bpWood = ctx.createBiquadFilter();
          bpWood.type = "bandpass";
          bpWood.Q.value = 3.2;
          bpWood.frequency.value = 1100;
          const hs = ctx.createBiquadFilter();
          hs.type = "highshelf";
          hs.frequency.value = 6500;
          hs.gain.value = -6;
          const gFric = ctx.createGain();
          gFric.gain.value = 0.85;
          const gWood = ctx.createGain();
          gWood.gain.value = 0.22;
          const master = ctx.createGain();
          const tS = ctx.currentTime;
          bpFric.frequency.setValueAtTime(2600, tS);
          bpFric.frequency.linearRampToValueAtTime(4100, tS + 0.28);
          bpFric.frequency.linearRampToValueAtTime(3000, tS + bufferDur);
          master.gain.setValueAtTime(0.0001, tS);
          master.gain.exponentialRampToValueAtTime(0.13, tS + 0.04);
          master.gain.setValueAtTime(0.13, tS + bufferDur - 0.10);
          master.gain.exponentialRampToValueAtTime(0.0001, tS + bufferDur);
          src.connect(bpFric).connect(gFric).connect(hs).connect(master);
          src.connect(bpWood).connect(gWood).connect(master);
          master.connect(ctx.destination);
          src.start(tS);
          break;
        }
      }
    },
    [enabled, getCtx, tone],
  );

  return play;
}
