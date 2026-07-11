/** ADSR gain-contour generator — one-shot, whole envelope rendered up front. */
export interface AdsrOptions {
  /** seconds, default 0.01 */
  attack?: number
  /** seconds, default 0.1 */
  decay?: number
  /** sustain level 0..1, default 0.7 */
  sustain?: number
  /** seconds, default 0.3 */
  release?: number
  /** note-on length, seconds (release starts here), default 1 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
}

export default function adsr(options?: AdsrOptions): Float32Array
