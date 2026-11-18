/** Yamaha DX7 FM engine: a bit-exact JavaScript port of the Music Synthesizer for Android core. */
export interface Dx7Options {
  /** 155-byte VCED voice (`parse(sysex)[i].patch`), default INIT VOICE */
  patch?: ArrayLike<number>
  /** 0..1, MIDI velocity / 127, default 1 */
  velocity?: number
  /** key held, seconds, default 1 */
  duration?: number
  /** seconds after key-up; default (null): until silent, at most 10 */
  release?: number | null
  /** sample rate above 16384, default 44100 */
  fs?: number
  /** upstream MSFA amplitude-EG timing (one DX7 EG step per output sample), default false */
  msfa?: boolean
}

/** freq: Hz of the key played (positional, family convention); within a cent of a key, that key exactly; the voice's transpose shifts it. */
export default function dx7(freq?: number, options?: Dx7Options): Float32Array

export interface VoiceOptions {
  /** MIDI note, fractional allowed, default 60 */
  note?: number
  /** MIDI velocity 0..127, default 100 */
  velocity?: number
  /** sample rate above 16384, default 44100 */
  fs?: number
  /** upstream MSFA amplitude-EG timing, default false */
  msfa?: boolean
}

export interface RenderOptions extends VoiceOptions {
  /** key held, seconds (rounded to 64-sample blocks), default 1 */
  duration?: number
  /** seconds after key-up (rounded up to blocks), default 1 */
  release?: number
}

/** Raw engine output, int32 in whole 64-sample blocks; 2^28 is full scale. */
export function render(patch: ArrayLike<number>, options?: RenderOptions): Int32Array

/** One note streamed in 64-sample blocks of raw int32 output. */
export class Voice {
  constructor(patch: ArrayLike<number>, options?: VoiceOptions)
  /** starts a note on this voice as a new Voice would, allocating nothing; `velocity` 0..127 */
  init(patch: ArrayLike<number>, note: number, velocity: number): void
  /** adds one 64-sample block into `out` (Int32Array(64)) and returns it */
  block(out: Int32Array): Int32Array
  /** releases the key */
  keyup(): void
  /** key up and every carrier EG at its final level */
  readonly done: boolean
  /** done, and every carrier below the gain the engine skips an operator at: every later block adds 0 */
  readonly silent: boolean
}

/** Seconds a note of `patch` can sound after the block its key goes up before, at most (MIDI keys 0..127 through the voice's transpose, velocity 127); Infinity where a carrier's L4 holds it audible. */
export function releaseTime(patch: ArrayLike<number>, options?: { fs?: number, msfa?: boolean }): number

export interface Dx7Voice {
  /** voice name, trailing spaces removed */
  name: string
  /** 155-byte VCED voice */
  patch: Uint8Array
}

/** Voices from DX7 sysex: 32-voice cartridge (VMEM), single voice (VCED), or headerless data. */
export function parse(bytes: Uint8Array | ArrayBuffer | ArrayLike<number>): Dx7Voice[]
/** VMEM packed voice (128 bytes) → VCED voice (155 bytes) */
export function unpack(bulk: ArrayLike<number>): Uint8Array
/** voice name of a VCED voice */
export function name(patch: ArrayLike<number>): string
/** the DX7's initialized voice: one sine carrier */
export const INIT: Uint8Array
/** maximum of each VCED parameter (minimum 0): bounds for matching over the 155 voice parameters */
export const MAX: Uint8Array
