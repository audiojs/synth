/** Frequency sweep generator — exponential (ESS) or linear. */
export interface ChirpOptions {
  /** start frequency, Hz, default 20 */
  f0?: number
  /** end frequency, Hz, default fs/2 * 0.95 */
  f1?: number
  /** seconds, default 1 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** sweep shape, default 'exp' */
  method?: 'exp' | 'lin'
  /** peak amplitude, default 0.9 */
  amp?: number
  /** edge fade, seconds, default 0.005 */
  fade?: number
}

export default function chirp(options?: ChirpOptions): Float32Array
