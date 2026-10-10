/** Modal snapshot from audio: the inverse of @audio/synth-modal. */
export interface FitOptions {
  /** sample rate, default 44100 */
  fs?: number
  /** Hz of ratio 1; default: the mode carrying the most energy */
  freq?: number | null
  /** keep at most this many modes, strongest by energy; default all */
  nmodes?: number
  /** drop modes whose energy falls this many dB below the strike's, default -80 */
  floor?: number
}

export interface ModalMode {
  /** frequency over `freq` */
  ratio: number
  /** amplitude over the reference mode's, signed (synth-modal's sine phase at the strike) */
  gain: number
  /** seconds to fall 60 dB */
  t60: number
}

/** synth-modal's own options: modal(snapshot.freq, snapshot) plays it back */
export interface ModalSnapshot {
  /** Hz of ratio 1 */
  freq: number
  /** synth-modal's amp: with these gains, every mode rings at its measured amplitude */
  amp: number
  /** ascending by ratio */
  modes: ModalMode[]
}

/** data: one strike, from shortly before its onset to before the next; mono or channels (mixed) */
export default function fit(data: Float32Array | Float64Array | ArrayLike<number> | ArrayLike<number>[], options?: FitOptions): ModalSnapshot
