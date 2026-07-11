/** Osc + envelope voice — one-pole lowpass with envelope-scaled cutoff (Tone.js Synth/MonoSynth class). */
export interface VoiceOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** oscillator waveform, default 'sawtooth' */
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
  /** note-on length, seconds, default 0.6 */
  duration?: number
  /** seconds, default 0.01 */
  attack?: number
  /** seconds, default 0.15 */
  decay?: number
  /** sustain level 0..1, default 0.6 */
  sustain?: number
  /** seconds, default 0.25 */
  release?: number
  /** lowpass cutoff at full envelope, Hz, default 3000 */
  cutoff?: number
  /** 0..1, how much the envelope scales the cutoff, default 0.6 */
  envAmount?: number
  /** peak amplitude, default 0.7 */
  amp?: number
}

/** freq: Hz (positional) */
export default function voice(freq: number, options?: VoiceOptions): Float32Array
