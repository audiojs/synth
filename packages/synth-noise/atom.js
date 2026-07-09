// atom manifest — noise generator with defined spectral slopes (white/pink/brown/blue/violet).
// Generator: no input bus, output width host-negotiated; whole-render (the batch
// kernel produces its buffer in one call, placed over the materialized timeline —
// `audio(5).noise()` renders noise over those 5 seconds).

import * as colors from './colors.js'

export const noise = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length
		const fn = colors[params.color]
		for (let c = 0; c < out.length; c++) {
			const d = fn(n, { seed: (params.seed[0] | 0) + c * 7919 })  // independent per channel
			const g = params.gain[0]
			for (let i = 0; i < n; i++) out[c][i] = d[i] * g
		}
	}
}
noise.channels = { inputs: [], outputs: 'any' }
noise.streaming = false
noise.params = {
	color: { type: 'enum', values: ['white', 'pink', 'brown', 'blue', 'violet'], default: 'white' },
	seed:  { type: 'number', min: 1, max: 65536, default: 1, step: 1 },
	gain:  { type: 'number', min: 0, max: 1, default: 0.8 },
}
