/** Drum synthesis — membrane (pitch-drop kick), metal (inharmonic cymbal), noiseDrum (snare/hat). */
export interface MembraneOptions {
  /** pitch-drop multiplier, default 3 */
  drop?: number
  /** seconds, default 0.5 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** peak amplitude, default 0.9 */
  amp?: number
}

export interface MetalOptions {
  /** seconds, default 0.6 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** peak amplitude, default 0.5 */
  amp?: number
}

export interface NoiseDrumOptions {
  /** seconds, default 0.25 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** peak amplitude, default 0.7 */
  amp?: number
  /** PRNG seed, default 9 */
  seed?: number
}

/** Sine kick with exponentially dropping pitch. */
export function membrane(freq?: number, options?: MembraneOptions): Float32Array
/** Six-partial inharmonic square-ish cymbal (classic FM-bell ratio set). */
export function metal(freq?: number, options?: MetalOptions): Float32Array
/** Decaying seeded band noise — snare/hat. */
export function noiseDrum(options?: NoiseDrumOptions): Float32Array

export default membrane
