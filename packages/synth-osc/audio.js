// atom manifest — oscillator as a generator: no input bus, band-limited (blep.js). The phase is kept from call to call
// in a Float64Array with the call's increment: blep.js's `fill` runs the sample loop on it, so no number is boxed (a
// number written to a closure variable, or passed to a call V8 did not inline, is a new object). The tables the
// band-limited waves read are built with the instance (blep.js `tables`, once for the module): `type` is live, so any
// block may be the first of a square, and process makes nothing.

import { fill, tables } from './blep.js'

// A value that scales the signal, glided sample by sample so that a host's steps of it join into one line. A host hands
// each call the value at its first frame and, while a value moves (a `smoothing` ramp), calls with 32 frames at most
// (contract 1.0: Parameters, Time; What a host owes, 3). So the line through the values the calls bring, each at its
// call's first frame, is known 32 frames behind any call's first frame, however the host cut the calls; the glide plays
// it 32 frames late. Straight from the value of one call to the next's, it is the host's ramp itself, in the value's
// own unit, the same whether the host calls with 1, 32 or a mix of frames; drawn between each call's end and the next
// (a glide across each call), a ramp cut 32, 4, 32 would put 32 frames of it into 4. A value that follows a call of
// more than 32 frames came with no ramp: it is reached in a straight line over 32 frames. The first call of an
// instance starts on its value, and a value held 32 frames is the value itself, so a value that does not move is bit
// for bit what the kernel makes of it alone.
// `g`: the memory, GLIDE slots a value from j·GLIDE (made NaN): the value the last call brought, where in the ring its
// first frame is, its frames, the frames the line had been at that value before it (64 once held and the ring all of
// it; counted to 63 at most, so that a long call after a move cannot reach 64 before the ring is made all of it), how
// many of `row`'s hold it, then the line, a frame a slot, in a ring of 64. `src`: the param's array. The line's values
// for this call's `n` frames go to `row` from `at`: as they are, or with `lin` 1 the gain e^(v·ln10/20) of a value in
// dB, per sample, so the gain follows the host's ramp of the dB value. Returns 1 while they move, 0 when every one is
// the value (then `row` holds it, filled once, and a caller may run its kernel on the value alone). Only arrays and
// whole numbers cross the call.
const GLIDE = 69
function glide (g, j, src, row, at, n, lin) {
	let o = j * GLIDE, r = o + 5, v = src[0], was = g[o]
	if (!(was === was)) { g[o] = v; g[o + 1] = 0; g[o + 2] = n; g[o + 3] = 0; g[o + 4] = 0 }
	else if (v !== was || g[o + 3] < 64) {
		let len = g[o + 2], L = len < 32 ? len : 32, w = (g[o + 1] + len) & 63, d = v - was, held = v === was ? Math.min(g[o + 3] + len, 63) : 0
		for (let q = 0; q < L; q++) g[r + ((w - L + q) & 63)] = was + d * q / L
		g[r + w] = v
		g[o] = v; g[o + 1] = w; g[o + 2] = n; g[o + 3] = held; g[o + 4] = 0
		if (held < 32) {
			for (let i = 0; i < n; i++) {
				let u = i < 32 ? g[r + ((w + i - 32) & 63)] : v
				row[at + i] = lin ? Math.exp(u * (Math.LN10 / 20)) : u
			}
			return 1
		}
	} else { g[o + 1] = (g[o + 1] + g[o + 2]) & 63; g[o + 2] = n }
	// held 32 frames: the ring made all of the value once (a move from it reads the line from there), the row filled
	// with it as far as no call since it was held has filled it; from then on a call only moves the ring's position
	if (g[o + 3] < 64) { for (let q = 0; q < 64; q++) g[r + q] = v; g[o + 3] = 64 }
	if (g[o + 4] < n) {
		let u = lin ? Math.exp(v * (Math.LN10 / 20)) : v
		for (let i = 0; i < n; i++) row[at + i] = u
		g[o + 4] = n
	}
	return 0
}

export const osc = (ctx) => {
	tables()
	const st = new Float64Array(2)   // phase, increment
	// gain scales the signal: glided (above), each sample's gain in `gains`, the value itself while it holds. The glide
	// runs its paths on its memory three times over (a first value, a move to another, held until it is the value, held
	// on), which is then made as built: V8 keeps no record of a function's first calls, and has then seen each path
	// before it optimizes process, so the first move of the gain seconds into a stream does not deoptimize it. The
	// values are fractions, as a gain is: V8 takes a whole number it has seen alone for a small integer, and a fraction
	// after it deoptimizes the code made on that
	const g = new Float64Array(GLIDE), gains = new Float64Array(ctx.maxBlockSize), v = new Float32Array(1)
	for (let k = 0, n = Math.min(32, ctx.maxBlockSize), m = 3 + Math.ceil(32 / n); k < 3 * m; k++) {
		if (k % m === 0) g.fill(NaN)
		v[0] = k % m ? 0.75 : 0.25
		glide(g, 0, v, gains, 0, n, 0)
	}
	g.fill(NaN)
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const f = params.freq[0] * 2 ** (params.detune[0] / 1200)
		st[1] = f / ctx.sampleRate
		const o0 = out[0]
		glide(g, 0, params.gain, gains, 0, o0.length, 0)
		fill(params.type, st, o0, gains)
		for (let c = 1; c < out.length; c++) out[c].set(o0)
	}
}
osc.channels = { inputs: [], outputs: 1 }
osc.params = {
	freq:   { type: 'number', min: 20, max: 20000, default: 440, curve: 'log', unit: 'Hz' },
	detune: { type: 'number', min: -1200, max: 1200, default: 0, unit: 'cents' },
	gain:   { type: 'number', min: 0, max: 1, default: 0.8, smoothing: 0.01 },
	type:   { type: 'enum', values: ['sine', 'square', 'sawtooth', 'triangle'], default: 'sine' },
}
