/** Classic waveform oscillator (periodic-function), with detune + phase offset. */
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
  /** custom waveform fn, overrides type */
  wave?: (t: number) => number
}

/** freq: Hz (positional) */
export default function osc(freq: number, options?: OscOptions): Float32Array
