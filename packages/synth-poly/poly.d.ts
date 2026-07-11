/** N-voice polyphonic allocator — oldest-note steal with 5ms fade, any pitched generator as voice. */
export interface PolyNote {
  time?: number
  freq?: number
  midi?: number
  duration?: number
  velocity?: number
}

export type Voice = (freq: number, opts: { fs: number, duration: number, velocity: number, [key: string]: unknown }) => Float32Array

export interface PolyOptions {
  /** required — voice function, family generator contract (freq, opts) => Float32Array */
  voice: Voice
  /** extra options forwarded to every voice call, default {} */
  voiceOpts?: Record<string, unknown>
  /** max simultaneous notes — oldest is stolen with a 5ms fade, default 16 */
  voices?: number
  /** total seconds; default: end of last note + 0.5 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
}

/** Returns the mono mix. */
export default function poly(notes: PolyNote[], options: PolyOptions): Float32Array
