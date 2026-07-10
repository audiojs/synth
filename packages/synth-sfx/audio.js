// atom manifest — sfxr-class game sound presets (pickup/laser/explosion/…).
// Generator: no input bus, output width host-negotiated; whole-render (the batch
// kernel produces its buffer in one call, placed over the materialized timeline —
// `audio(5).sfx()` renders sfx over those 5 seconds).

import sfxFn from './sfx.js'

export const sfx = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length
		const d = sfxFn(params.preset, { fs: ctx.sampleRate })
		const m = Math.min(n, d.length)
		for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
	}
}
sfx.channels = { inputs: [], outputs: 'any' }
sfx.streaming = false
sfx.params = {
	preset: { type: 'enum', values: ['pickup', 'laser', 'explosion', 'powerup', 'hit', 'jump', 'blip', 'coin'], default: 'blip' },
}
