// atom manifest — frequency sweep (exponential or linear chirp) over the timeline duration.
// Generator: no input bus, output width host-negotiated; whole-render (the batch
// kernel produces its buffer in one call, placed over the materialized timeline —
// `audio(5).chirp()` renders chirp over those 5 seconds).

import chirpFn from './chirp.js'

export const chirp = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length
		const d = chirpFn({
			f0: params.f0[0], f1: params.f1[0],
			duration: n / ctx.sampleRate, fs: ctx.sampleRate,
			method: params.method, amp: params.amp[0],
		})
		const m = Math.min(n, d.length)
		for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
	}
}
chirp.channels = { inputs: [], outputs: 'any' }
chirp.streaming = false
chirp.params = {
	f0:     { type: 'number', min: 1, max: 20000, default: 20, unit: 'Hz', curve: 'log' },
	f1:     { type: 'number', min: 1, max: 22050, default: 20000, unit: 'Hz', curve: 'log' },
	method: { type: 'enum', values: ['exp', 'linear'], default: 'exp' },
	amp:    { type: 'number', min: 0, max: 1, default: 0.9 },
}
