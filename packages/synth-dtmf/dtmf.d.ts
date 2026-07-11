/** DTMF dual-tone signaling — ITU-T Q.23 row/column frequencies. */
export interface DtmfOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** per-digit tone length, seconds, default 0.08 */
  tone?: number
  /** inter-digit silence, seconds, default 0.04 */
  gap?: number
  /** amplitude of each of the two sines, default 0.45 */
  amp?: number
}

/** digits: string of 0-9, A-D, *, # */
export default function dtmf(digits: string | number, options?: DtmfOptions): Float32Array
