// atom manifest — percussion one-shots (Tone.js parity: MembraneSynth = kick,
// MetalSynth = cymbal, NoiseSynth = snare). Three atoms from one file. Generators:
// no input bus, output width host-negotiated; whole-render one-shots placed at the
// start of the materialized timeline.

import { membrane, metal, noiseDrum } from './drum.js'

const place = (out, d) => {
	const n = out[0].length, m = Math.min(n, d.length)
	for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
}

export const kick = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	place(out, membrane({ freq: params.freq[0], drop: params.drop[0], duration: Math.min(out[0].length / ctx.sampleRate, 2), fs: ctx.sampleRate, amp: params.amp[0] }))
}
kick.channels = { inputs: [], outputs: 'any' }
kick.streaming = false
kick.params = {
	freq: { type: 'number', min: 30, max: 120, default: 55, unit: 'Hz' },
	drop: { type: 'number', min: 1, max: 8, default: 3 },
	amp:  { type: 'number', min: 0, max: 1, default: 0.9 },
}

export const cymbal = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	place(out, metal({ freq: params.freq[0], duration: Math.min(out[0].length / ctx.sampleRate, 2), fs: ctx.sampleRate, amp: params.amp[0] }))
}
cymbal.channels = { inputs: [], outputs: 'any' }
cymbal.streaming = false
cymbal.params = {
	freq: { type: 'number', min: 100, max: 800, default: 200, unit: 'Hz' },
	amp:  { type: 'number', min: 0, max: 1, default: 0.5 },
}

export const snare = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	place(out, noiseDrum({ duration: Math.min(out[0].length / ctx.sampleRate, 1), fs: ctx.sampleRate, amp: params.amp[0], seed: params.seed[0] | 0 }))
}
snare.channels = { inputs: [], outputs: 'any' }
snare.streaming = false
snare.params = {
	amp:  { type: 'number', min: 0, max: 1, default: 0.7 },
	seed: { type: 'number', min: 1, max: 65536, default: 9, step: 1 },
}
