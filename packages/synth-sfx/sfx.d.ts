/** ZZFX/sfxr-class parameterized SFX generator — shaped osc → slide/vibrato/arp → envelope → lowpass/bitcrush. */
export type SfxPreset = 'pickup' | 'laser' | 'explosion' | 'powerup' | 'hit' | 'jump' | 'blip' | 'coin'

export interface SfxOptions {
  /** base frequency, Hz */
  freq?: number
  /** waveform */
  shape?: 'sine' | 'square' | 'saw' | 'triangle' | 'noise'
  /** octaves/second exponential pitch slide, default 0 */
  slide?: number
  /** Hz, default 0 */
  vibrato?: number
  /** depth, default 0.1 */
  vibratoDepth?: number
  /** frequency multiplier stepped at arpAt, default 0 */
  arp?: number
  /** seconds, default 0.05 */
  arpAt?: number
  /** seconds, default 0.005 */
  attack?: number
  /** seconds, default 0.08 */
  sustain?: number
  /** seconds, default 0.12 */
  release?: number
  /** one-pole lowpass cutoff Hz, 0 = off, default 0 */
  lowpass?: number
  /** 0..1 bitcrush amount, default 0 */
  crush?: number
  /** sample rate, default 44100 */
  fs?: number
  /** peak amplitude, default 0.8 */
  amp?: number
  /** noise PRNG seed */
  seed?: number
}

export const PRESETS: Record<SfxPreset, SfxOptions>

/** preset: named preset ('blip' default) or a full parameter object */
export default function sfx(preset?: SfxPreset | SfxOptions, options?: SfxOptions): Float32Array
