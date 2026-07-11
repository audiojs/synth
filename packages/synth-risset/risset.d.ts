/** Risset drum — inharmonic partials + octave-below sub-sine, simplified bell-drum catalogue. */
export interface RissetOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** seconds, default 1.2 */
  duration?: number
  /** peak amplitude (post-normalization), default 0.6 */
  amp?: number
}

/** freq: Hz (positional) */
export default function risset(freq?: number, options?: RissetOptions): Float32Array
