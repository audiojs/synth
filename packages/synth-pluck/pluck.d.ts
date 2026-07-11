/** Karplus-Strong plucked string — seeded noise burst through an averaging delay loop. */
export interface PluckOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** seconds, default 1 */
  duration?: number
  /** noise-burst amplitude, default 0.7 */
  amp?: number
  /** loop damping 0.9..0.9999, default 0.996 */
  damp?: number
  /** PRNG seed, default 1 */
  seed?: number
}

/** freq: Hz (positional) — sets the delay-loop length */
export default function pluck(freq: number, options?: PluckOptions): Float32Array
