// atom manifest — modal synthesis: two-pole resonator bank over a named mode table.
// Generator: no input bus, output width host-negotiated; whole-render one-shot placed at
// the start of the materialized timeline. `modes` (custom per-mode overrides) and a
// Float32Array `exciter` have no representation in the params system (array/typed-array,
// not scalar/enum/bool) — the manifest exposes the named-model, impulse/noise-exciter form
// only; use the JS kernel directly for custom mode tables or a custom excitation buffer.

import modalFn from './modal.js'

export const modal = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	const n = out[0].length
	const d = modalFn({
		freq: params.freq[0], model: params.model, nmodes: params.nmodes[0] | 0,
		t60: params.t60[0], damping: params.damping[0], inharmonicity: params.inharmonicity[0],
		strike: params.strike[0], exciter: params.exciter, duration: n / ctx.sampleRate,
		fs: ctx.sampleRate, amp: params.amp[0], seed: params.seed[0] | 0,
	})
	const m = Math.min(n, d.length)
	for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
}
modal.channels = { inputs: [], outputs: 'any' }
modal.streaming = false
modal.params = {
	freq:          { type: 'number', min: 20, max: 5000, default: 440, unit: 'Hz', curve: 'log' },
	model:         { type: 'enum', values: ['string', 'bar', 'membrane', 'plate', 'tube-open', 'tube-closed'], default: 'bar' },
	nmodes:        { type: 'number', min: 1, max: 16, default: 8, step: 1 },
	t60:           { type: 'number', min: 0.05, max: 20, default: 2, unit: 's', curve: 'log' },
	damping:       { type: 'number', min: 0, max: 2, default: 0.7 },
	inharmonicity: { type: 'number', min: 0, max: 0.01, default: 0 },
	strike:        { type: 'number', min: 0, max: 1, default: 0.5 },
	exciter:       { type: 'enum', values: ['impulse', 'noise'], default: 'impulse' },
	amp:           { type: 'number', min: 0, max: 1, default: 0.8 },
	seed:          { type: 'number', min: 1, max: 65536, default: 9, step: 1 },
}
