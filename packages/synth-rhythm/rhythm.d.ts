/** Metronome/click-track generator — decaying tone bursts on a BPM grid, accented downbeats. */
export interface RhythmOptions {
  /** beats per minute, default 120 */
  bpm?: number
  /** number of bars, default 4 */
  bars?: number
  /** beats per bar, default 4 */
  beats?: number
  /** sample rate, default 44100 */
  fs?: number
  /** regular-beat click frequency, Hz, default 1000 */
  freq?: number
  /** downbeat click frequency, Hz, default 1500 */
  accentFreq?: number
  /** downbeat amplitude (regular beats: amp*0.7), default 0.7 */
  amp?: number
}

export default function rhythm(options?: RhythmOptions): Float32Array
