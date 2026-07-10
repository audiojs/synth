type NoiseOpts = { seed?: number, fs?: number }
export function white(duration?: number, opts?: NoiseOpts): Float32Array
export function pink(duration?: number, opts?: NoiseOpts): Float32Array
export function brown(duration?: number, opts?: NoiseOpts & { leak?: number }): Float32Array
export function blue(duration?: number, opts?: NoiseOpts): Float32Array
export function violet(duration?: number, opts?: NoiseOpts): Float32Array
export { default as pinkNoise } from './pink-noise.js'
/** Seeded noise generator — duration in seconds (family convention: (duration, opts)) */
export default function noise(duration?: number, opts?: NoiseOpts & { color?: 'white' | 'pink' | 'brown' | 'blue' | 'violet' }): Float32Array
