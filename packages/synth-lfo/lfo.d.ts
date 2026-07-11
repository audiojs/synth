/** Low-frequency control-rate generator — sine/triangle/square/saw, bipolar or unipolar. */
export interface LfoOptions {
  /** seconds, default 1 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** waveform, default 'sine' */
  type?: 'sine' | 'triangle' | 'square' | 'saw'
  /** false: -1..1, true: 0..1, default false */
  unipolar?: boolean
  /** starting phase 0..1, default 0 */
  phase?: number
}

/** freq: Hz (positional) */
export default function lfo(freq?: number, options?: LfoOptions): Float32Array
