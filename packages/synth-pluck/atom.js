// atom manifest — Karplus-Strong plucked string.
// Generator: no input bus, output width host-negotiated; whole-render (the batch
// kernel produces its buffer in one call, placed over the materialized timeline —
// `audio(5).pluck()` renders pluck over those 5 seconds).

import pluckFn from './pluck.js'

export const pluck = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length
		const d = pluckFn(params.freq[0], {
			fs: ctx.sampleRate, duration: n / ctx.sampleRate,
			amp: params.amp[0], damp: params.damp[0], seed: params.seed[0] | 0,
		})
		const m = Math.min(n, d.length)
		for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
	}
}
pluck.channels = { inputs: [], outputs: 'any' }
pluck.streaming = false
pluck.params = {
	freq: { type: 'number', min: 20, max: 4000, default: 220, unit: 'Hz', curve: 'log' },
	damp: { type: 'number', min: 0.9, max: 0.9999, default: 0.996 },
	amp:  { type: 'number', min: 0, max: 1, default: 0.7 },
	seed: { type: 'number', min: 1, max: 65536, default: 1, step: 1 },
}
