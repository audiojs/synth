/** Modal synthesis — impulse-invariant resonator bank, per-model literature mode-ratio tables (Fletcher & Rossing). */
export interface ModalMode {
  ratio: number
  gain?: number
  t60?: number
}

export interface ModalOptions {
  /** default 'bar' */
  model?: 'string' | 'bar' | 'membrane' | 'plate' | 'tube-open' | 'tube-closed'
  /** custom modes — overrides model/nmodes/inharmonicity */
  modes?: ModalMode[]
  /** modes drawn from the model's table, default 8 */
  nmodes?: number
  /** fundamental decay time, seconds (-60dB), default 2 */
  t60?: number
  /** HF loss exponent: t60_k = t60*(f1/fk)^damping, default 0.7 */
  damping?: number
  /** string-only stiffness coefficient B: fk = k*f1*sqrt(1+B*k^2), default 0 */
  inharmonicity?: number
  /** 0..1 strike/pluck position (1D models only), default 0.5 */
  strike?: number
  /** default 'impulse' */
  exciter?: 'impulse' | 'noise' | Float32Array
  /** seconds; default covers the slowest mode's T60 */
  duration?: number | null
  /** sample rate, default 44100 */
  fs?: number
  /** peak amplitude, default 0.8 */
  amp?: number
  /** noise-exciter PRNG seed, default 9 */
  seed?: number
}

/** freq: fundamental (mode 1) Hz (positional — family convention: (freq, opts)) */
export default function modal(freq?: number, options?: ModalOptions): Float32Array
