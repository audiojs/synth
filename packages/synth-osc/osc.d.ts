/** Classic waveform oscillator, band-limited, with detune + phase offset. */
export interface OscOptions {
  /** seconds, default 1 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** default 'sine' */
  type?: 'sine' | 'square' | 'sawtooth' | 'triangle'
  /** peak amplitude, default 0.8 */
  amp?: number
  /** cents, default 0 */
  detune?: number
  /** starting phase 0..1, default 0 */
  phase?: number
  /** custom waveform fn, overrides type (rendered as given, not band-limited) */
  wave?: (t: number) => number
}

/** freq: Hz (positional) */
export default function osc(freq: number, options?: OscOptions): Float32Array

/** One sample of a band-limited waveform at phase t ∈ [0, 1) advancing dt = f/fs per sample (BLEP / BLAMP). */
export function wave(type: 'sine' | 'square' | 'sawtooth' | 'triangle', t: number, dt: number): number
