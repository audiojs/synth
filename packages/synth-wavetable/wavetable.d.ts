/** Morphing wavetable oscillator (WaveEdit class) — crossfades through a bank of single-cycle tables. */
export interface WavetableOptions {
  /** required — single-cycle waveforms */
  tables: Float32Array[]
  /** 0..1, or a function progress => position, default 0 */
  position?: number | ((progress: number) => number)
  /** seconds, default 1 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** peak amplitude, default 0.8 */
  amp?: number
}

/** freq: Hz (positional) */
export default function wavetable(freq: number, options: WavetableOptions): Float32Array
