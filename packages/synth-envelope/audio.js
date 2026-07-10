// atom manifest — ADSR applied as a gain envelope over the whole take (attack/decay
// at the start, release ending at the end — Tone.js "envelope applicable to gain").
// whole-render: the envelope spans the full duration, so release placement needs the
// total length up front.

import adsrFn from './envelope.js'

export const adsr = (ctx) => {
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		const n = inp[0].length
		const env = adsrFn({
			attack: params.attack[0], decay: params.decay[0],
			sustain: params.sustain[0], release: params.release[0],
			// kernel total = duration + release — place the release so it ends at the take's end
			duration: Math.max(0, n / ctx.sampleRate - params.release[0]), fs: ctx.sampleRate,
		})
		const m = Math.min(n, env.length)
		for (let c = 0; c < inp.length; c++) {
			const x = inp[c], y = out[c]
			for (let i = 0; i < m; i++) y[i] = x[i] * env[i]
			for (let i = m; i < n; i++) y[i] = 0
		}
	}
}
adsr.channels = 'any'
adsr.streaming = false
adsr.params = {
	attack:  { type: 'number', min: 0.001, max: 2, default: 0.01, unit: 's', curve: 'log' },
	decay:   { type: 'number', min: 0.001, max: 2, default: 0.1, unit: 's', curve: 'log' },
	sustain: { type: 'number', min: 0, max: 1, default: 0.7 },
	release: { type: 'number', min: 0.001, max: 4, default: 0.3, unit: 's', curve: 'log' },
}
