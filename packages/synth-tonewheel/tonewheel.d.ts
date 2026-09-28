/** Tonewheel organ (Hammond B-3 upper manual): geared tonewheels, drawbars, foldback, percussion, scanner. */
export interface TonewheelNote {
  /** seconds, default 0 */
  time?: number
  /** Hz, lands on the nearest manual key */
  freq?: number
  /** MIDI key 36..96, overrides freq */
  midi?: number
  /** key held, seconds, default the `duration` option */
  duration?: number
}

export interface TonewheelOptions {
  /** nine drawbars 0..8 in panel order 16' 5⅓' 8' 4' 2⅔' 2' 1⅗' 1⅓' 1', as '888000000' or an array; default '888000000' */
  drawbars?: string | ArrayLike<number>
  /** key held, seconds, default 1 */
  duration?: number
  /** sample rate, default 44100 */
  fs?: number
  /** one key with all nine drawbars at 8 peaks at most here, default 0.8 */
  amp?: number
  /** harmonic percussion: 4' ('second') or 2⅔' ('third'), single-triggered; default false */
  percussion?: false | 'second' | 'third'
  /** default 'fast' (−60 dB in 1 s; 'slow' in 4 s) */
  percussionDecay?: 'fast' | 'slow'
  /** default 'normal' (cuts the organ signal); 'soft' cuts the percussion */
  percussionVolume?: 'normal' | 'soft'
  /** key contact abruptness 0..1: 1 switches tonewheels in instantly, 0 ramps them over 5 ms; default 1 */
  click?: number
  /** vibrato/chorus scanner setting, default false */
  vibrato?: false | 'v1' | 'v2' | 'v3' | 'c1' | 'c2' | 'c3'
}

/** notes: Hz of one key, Hz[] of keys pressed together, or a note list; family (freq, opts) contract. */
export default function tonewheel(notes?: number | number[] | TonewheelNote[], options?: TonewheelOptions): Float32Array

/** drawbar footages, panel order */
export const FOOTAGE: string[]
/** semitones of each drawbar above the key's 8' pitch */
export const OFFSET: number[]
/** matching-transformer turns per drawbar position 0..8 (US 1,956,350) */
export const TAPS: number[]
/** linear level of drawbar position n, 1 at 8 */
export function level(n: number): number
/** frequency of tonewheel 1..91, Hz */
export function wheelHz(w: number): number
/** tonewheel on drawbar d (0..8) of MIDI key `midi`, with foldback */
export function wheel(midi: number, d: number): number
/** '88 8000 000' or an array → nine integers 0..8 */
export function registration(drawbars: string | ArrayLike<number>): number[]
/** manual range, MIDI */
export const LOWEST: number
export const HIGHEST: number
/** percussion constants: drawbar index per harmonic, −60 dB times (s), peaks (× a drawbar at 8), soft and organ-cut gains */
export const PERCUSSION: {
  drawbar: { second: number, third: number }
  t60: { fast: number, slow: number }
  peak: { fast: number, slow: number }
  soft: number
  organCut: number
}
/** scanner constants: rotation (Hz), full-line delay (s), share of the line per setting */
export const SCANNER: {
  hz: number
  line: number
  depth: { v1: number, v2: number, v3: number, c1: number, c2: number, c3: number }
}
