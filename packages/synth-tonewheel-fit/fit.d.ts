/** Tonewheel registration from audio: the inverse of @audio/synth-tonewheel. */
export interface FitOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** Hz of the key (8' pitch), or Hz[] for a chord; estimated for a single key when omitted */
  freq?: number | number[] | null
  /** the render's `amp` when known: absolute levels; otherwise the loudest drawbar is 8 */
  amp?: number | null
  /** scanner setting when known, false for none, 'auto' (default) to detect it */
  vibrato?: 'auto' | false | null | 'v1' | 'v2' | 'v3' | 'c1' | 'c2' | 'c3'
}

export interface FitResult {
  /** nine digits 0..8, panel order 16' … 1' */
  drawbars: string
  /** the same as integers */
  registration: number[]
  /** fitted linear levels before quantization, 1 = drawbar at 8 */
  levels: number[]
  /** MIDI keys analyzed (given, or the estimated perceived pitch) */
  keys: number[]
  /** percussion guess, null when none */
  percussion: null | { harmonic: 'second' | 'third', decay: 'fast' | 'slow', volume: 'normal' | 'soft' }
  /** scanner setting given or detected, null when none */
  vibrato: null | 'v1' | 'v2' | 'v3' | 'c1' | 'c2' | 'c3'
  /** 0..1: share of the note's spectrum inside the wheel bands × share of the wheel tracks the quantized registration explains */
  score: number
}

/** data: sustained organ audio, mono or channels (stereo powers add) */
export default function fit(data: Float32Array | Float64Array | ArrayLike<number>[], options?: FitOptions): FitResult
