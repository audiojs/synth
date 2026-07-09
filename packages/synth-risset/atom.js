// atom manifest — Risset drum (inharmonic partials + gliding fundamental).
// Generator: no input bus, output width host-negotiated; whole-render (the batch
// kernel produces its buffer in one call, placed over the materialized timeline —
// `audio(5).risset()` renders risset over those 5 seconds).

import rissetFn from './risset.js'

export const risset = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length
		const d = rissetFn(params.freq[0], { fs: ctx.sampleRate, duration: n / ctx.sampleRate, amp: params.amp[0] })
		const m = Math.min(n, d.length)
		for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
	}
}
risset.channels = { inputs: [], outputs: 'any' }
risset.streaming = false
risset.params = {
	freq: { type: 'number', min: 30, max: 1000, default: 100, unit: 'Hz', curve: 'log' },
	amp:  { type: 'number', min: 0, max: 1, default: 0.6 },
}
