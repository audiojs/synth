// Colors of noise — seeded, deterministic generators with defined spectral slopes:
// white 0 dB/oct · pink −3 (Kellet filter) · brown −6 (leaky integration) ·
// blue +3 (differentiated pink) · violet +6 (differentiated white).

import pinkNoise from './pink-noise.js'

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

export function white (n, { seed = 1 } = {}) {
	let rand = lcg(seed)
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = rand() * 0.9
	return d
}

export function pink (n, opts = {}) {
	let d = Float64Array.from(white(n, opts))
	pinkNoise(d, {})
	return normalize(Float32Array.from(d))
}

export function brown (n, { seed = 1, leak = 0.999 } = {}) {
	let rand = lcg(seed)
	let d = new Float32Array(n)
	let y = 0
	for (let i = 0; i < n; i++) d[i] = y = y * leak + rand() * 0.02
	return normalize(d)
}

export function blue (n, opts = {}) {
	let p = pink(n + 1, opts)
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = p[i + 1] - p[i]
	return normalize(d)
}

export function violet (n, opts = {}) {
	let w = white(n + 1, opts)
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = w[i + 1] - w[i]
	return normalize(d)
}

/** noise(n, { color: 'white'|'pink'|'brown'|'blue'|'violet', seed }) */
export default function noise (n, { color = 'white', ...opts } = {}) {
	const GEN = { white, pink, brown, blue, violet }
	if (!GEN[color]) throw new RangeError(`noise: unknown color "${color}"`)
	return GEN[color](n, opts)
}
