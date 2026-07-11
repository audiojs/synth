/** Chowning FM (DX7-style phase modulation) — single-op or serial ops stack. */
export interface FmOp {
  /** modulator:carrier frequency ratio */
  ratio?: number
  /** peak modulation index, radians */
  index?: number
  /** index decay time constant, seconds; 0 = static */
  indexDecay?: number
  /** index floor after decay */
  indexFloor?: number
  /** modulator self-feedback, radians */
  feedback?: number
}

export interface FmOptions extends FmOp {
  /** serial modulator stack, innermost-first — overrides ratio/index/indexDecay/indexFloor/feedback */
  ops?: FmOp[]
  /** seconds, default 1 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** peak amplitude, default 0.8 */
  amp?: number
  /** seconds, default 0.005 */
  attack?: number
  /** seconds, default 0.1 */
  release?: number
}

/** freq: carrier Hz (positional — family convention: (freq, opts)) */
export default function fm(freq?: number, options?: FmOptions): Float32Array
/** Chowning's inharmonic bell/gong (1:1.4 ratio, decaying brightness). */
export function bell(freq?: number, options?: FmOptions & { duration?: number }): Float32Array
/** 2-op DX7-style electric piano voicing. */
export function epiano(freq?: number, options?: FmOptions & { duration?: number }): Float32Array
