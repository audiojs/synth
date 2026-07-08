// audio-module manifest — oscillator as a generator: no input bus, phase in closure.

import { sine, square, sawtooth, triangle } from 'periodic-function'

const WAVES = { sine, square, sawtooth, triangle }

export const osc = (ctx) => {
	let t = 0
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const f = params.freq[0] * 2 ** (params.detune[0] / 1200)
		const dt = f / ctx.sampleRate
		const fn = WAVES[params.type]
		const g = params.gain[0]
		const o0 = out[0]
		for (let i = 0; i < o0.length; i++) {
			o0[i] = g * fn(t % 1)
			t += dt
		}
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
