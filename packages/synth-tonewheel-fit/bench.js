// Round-trip bench: random registrations rendered by @audio/synth-tonewheel, through the
// scanner, a Leslie (@audio/effect-rotary) or reverb (@audio/reverb-freeverb), fit back.
// Keys C3..C5 (no foldback), 1.5 s notes; registrations up to gain have their loudest
// drawbar at 8. Run from the family root: node packages/synth-tonewheel-fit/bench.js [n]

import tonewheel from '@audio/synth-tonewheel'
import rotary from '@audio/effect-rotary'
import freeverb from '@audio/reverb-freeverb'
import fit from './fit.js'

const fs = 44100, N = Number(process.argv[2] || 100)
const lcg = (seed) => (n) => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % (n + 1) }
const hz = (key) => 440 * 2 ** ((key - 69) / 12)
function registrations (n, seed, canonical = true) {
	let rnd = lcg(seed)
	return Array.from({ length: n }, () => {
		let r = Array.from({ length: 9 }, () => rnd(8))
		if (canonical || r.every(v => !v)) r[rnd(8)] = 8
		return { drawbars: r.join(''), key: 48 + rnd(24) }
	})
}
const leslie = (speed, mics) => (x) => {
	let L = Float64Array.from(x), R = Float64Array.from(x)
	rotary(L, R, { speed, fs })
	return mics === 2 ? [L, R] : mics === 1 ? L : L.map((v, i) => (v + R[i]) / 2)
}
const room = (mix) => (x) => freeverb(Float32Array.from(x), { fs, mix })

const conditions = [
	['dry'], ['vibrato V1', { vibrato: 'v1' }], ['vibrato V2', { vibrato: 'v2' }], ['vibrato V3', { vibrato: 'v3' }],
	['chorus C1', { vibrato: 'c1' }], ['chorus C2', { vibrato: 'c2' }], ['chorus C3', { vibrato: 'c3' }],
	['Leslie chorale, two mics', {}, leslie('chorale', 2)], ['Leslie tremolo, two mics', {}, leslie('tremolo', 2)],
	['Leslie chorale, one mic', {}, leslie('chorale', 1)], ['Leslie chorale, mics summed', {}, leslie('chorale', 0)],
	['reverb, freeverb defaults (mix 0.33)', {}, room(0.33)], ['reverb, mix 0.15', {}, room(0.15)],
]

const pct = (k) => `${Math.round(100 * k / N)}%`.padStart(5)
console.log(`${N} registrations each | exact | every drawbar ±1 | mean |error| | scanner read`)
for (let [name, opts = {}, fx] of conditions) {
	let exact = 0, near = 0, mae = 0, read = 0
	for (let { drawbars, key } of registrations(N, 101)) {
		let x = tonewheel(hz(key), { drawbars, duration: 1.5, ...opts })
		let r = fit(fx ? fx(x) : x, { freq: hz(key) })
		let err = [...r.drawbars].map((d, k) => Math.abs(d - drawbars[k]))
		exact += r.drawbars === drawbars
		near += err.every(e => e <= 1)
		mae += err.reduce((a, b) => a + b) / 9
		read += r.vibrato === (opts.vibrato ?? null)
	}
	console.log(`${name.padEnd(38)} ${pct(exact)} ${pct(near)}   ${(mae / N).toFixed(3)}   ${pct(read)}`)
}
let known = 0
for (let { drawbars, key } of registrations(N, 202, false)) known += fit(tonewheel(hz(key), { drawbars, duration: 1.5 }), { freq: hz(key), amp: 0.8 }).drawbars === drawbars
console.log(`${'dry, gain known, any registration'.padEnd(38)} ${pct(known)}`)
for (let [name, fx] of [['major triads, dry', (x) => x], ['major triads, reverb mix 0.33', room(0.33)]]) {
	let exact = 0, near = 0
	for (let { drawbars, key } of registrations(N, 303)) {
		let chord = [0, 4, 7].map(s => hz(key + s)), r = fit(fx(tonewheel(chord, { drawbars, duration: 1.5 })), { freq: chord })
		exact += r.drawbars === drawbars
		near += [...r.drawbars].every((d, k) => Math.abs(d - drawbars[k]) <= 1)
	}
	console.log(`${name.padEnd(38)} ${pct(exact)} ${pct(near)}`)
}
