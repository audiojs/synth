// Colors of noise — seeded, deterministic generators with defined spectral slopes:
// white 0 dB/oct · pink −3 (Kellet filter) · brown −6 (leaky integration) ·
// blue +3 (differentiated pink) · violet +6 (differentiated white).
//
// Public API is (duration, opts) in SECONDS — the family convention every other
// generator follows (osc, chirp, fm…). Sample-count cores stay private: the
// differentiators (blue, violet) need exact n+1-sample sources.

import pinkNoise from './pink-noise.js'
export { default as pinkNoise } from './pink-noise.js'

function lcg (seed) {
	let s = seed >>> 0 || 1
	return () => {
		s = (s * 1103515245 + 12345) & 0x7fffffff
		return s / 0x3fffffff - 1
	}
}
function normalize (d, peak = 0.9) {
	let m = 0
	for (let i = 0; i < d.length; i++) { let a = Math.abs(d[i]); if (a > m) m = a }
	if (m > 0) for (let i = 0; i < d.length; i++) d[i] *= peak / m
	return d
}

function whiteN (n, seed) {
	let rand = lcg(seed)
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = rand() * 0.9
	return d
}

function pinkN (n, seed) {
	let d = Float64Array.from(whiteN(n, seed))
	pinkNoise(d, {})
	return normalize(Float32Array.from(d))
}

function brownN (n, seed, leak) {
	let rand = lcg(seed)
	let d = new Float32Array(n)
	let y = 0
	for (let i = 0; i < n; i++) d[i] = y = y * leak + rand() * 0.02
	return normalize(d)
}

function blueN (n, seed) {
	let p = pinkN(n + 1, seed)
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = p[i + 1] - p[i]
	return normalize(d)
}

function violetN (n, seed) {
	let w = whiteN(n + 1, seed)
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = w[i + 1] - w[i]
	return normalize(d)
}

export function white (duration = 1, { seed = 1, fs = 44100 } = {}) { return whiteN(Math.round(duration * fs), seed) }
export function pink (duration = 1, { seed = 1, fs = 44100 } = {}) { return pinkN(Math.round(duration * fs), seed) }
export function brown (duration = 1, { seed = 1, leak = 0.999, fs = 44100 } = {}) { return brownN(Math.round(duration * fs), seed, leak) }
export function blue (duration = 1, { seed = 1, fs = 44100 } = {}) { return blueN(Math.round(duration * fs), seed) }
export function violet (duration = 1, { seed = 1, fs = 44100 } = {}) { return violetN(Math.round(duration * fs), seed) }

/** noise(duration, { color: 'white'|'pink'|'brown'|'blue'|'violet', seed, fs }) — seconds */
export default function noise (duration = 1, { color = 'white', ...opts } = {}) {
	const GEN = { white, pink, brown, blue, violet }
	if (!GEN[color]) throw new RangeError(`noise: unknown color "${color}"`)
	return GEN[color](duration, opts)
}
