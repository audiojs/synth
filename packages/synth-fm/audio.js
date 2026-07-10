// atom manifest — FM (phase modulation) synthesis: a generic single-op atom plus the
// bell/epiano presets. Generators: no input bus, output width host-negotiated; whole-render
// one-shots placed at the start of the materialized timeline. `ops` (the serial modulator
// stack) has no representation in the params system (array of objects, not a scalar/enum/
// bool) — the manifest exposes the single-op form only; use the JS kernel directly for stacks.

import fmFn, { bell as bellFn, epiano as epianoFn } from './fm.js'

const place = (out, d) => {
	const n = out[0].length, m = Math.min(n, d.length)
	for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
}

export const fm = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	place(out, fmFn(params.freq[0], {
		ratio: params.ratio[0], index: params.index[0],
		indexDecay: params.indexDecay[0], indexFloor: params.indexFloor[0], feedback: params.feedback[0],
		duration: out[0].length / ctx.sampleRate, fs: ctx.sampleRate, amp: params.amp[0],
		attack: params.attack[0], release: params.release[0],
	}))
}
fm.channels = { inputs: [], outputs: 'any' }
fm.streaming = false
fm.params = {
	freq:       { type: 'number', min: 20, max: 20000, default: 440, unit: 'Hz', curve: 'log' },
	ratio:      { type: 'number', min: 0.01, max: 20, default: 2, curve: 'log' },
	index:      { type: 'number', min: 0, max: 20, default: 5, unit: 'rad' },
	indexDecay: { type: 'number', min: 0, max: 10, default: 0, unit: 's' },
	indexFloor: { type: 'number', min: 0, max: 20, default: 0, unit: 'rad' },
	feedback:   { type: 'number', min: 0, max: 6.2832, default: 0, unit: 'rad' },
	amp:        { type: 'number', min: 0, max: 1, default: 0.8 },
	attack:     { type: 'number', min: 0, max: 2, default: 0.005, unit: 's' },
	release:    { type: 'number', min: 0, max: 4, default: 0.1, unit: 's' },
}

export const bell = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	place(out, bellFn(params.freq[0], { duration: out[0].length / ctx.sampleRate, fs: ctx.sampleRate, amp: params.amp[0] }))
}
bell.channels = { inputs: [], outputs: 'any' }
bell.streaming = false
bell.params = {
	freq: { type: 'number', min: 20, max: 20000, default: 440, unit: 'Hz', curve: 'log' },
	amp:  { type: 'number', min: 0, max: 1, default: 0.8 },
}

export const epiano = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	place(out, epianoFn(params.freq[0], { duration: out[0].length / ctx.sampleRate, fs: ctx.sampleRate, amp: params.amp[0] }))
}
epiano.channels = { inputs: [], outputs: 'any' }
epiano.streaming = false
epiano.params = {
	freq: { type: 'number', min: 20, max: 20000, default: 440, unit: 'Hz', curve: 'log' },
	amp:  { type: 'number', min: 0, max: 1, default: 0.8 },
}
