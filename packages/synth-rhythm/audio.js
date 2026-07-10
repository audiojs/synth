// atom manifest — metronome / click track at a BPM grid, accented downbeats.
// Generator: no input bus, output width host-negotiated; whole-render (the batch
// kernel produces its buffer in one call, placed over the materialized timeline —
// `audio(5).rhythm()` renders rhythm over those 5 seconds).

import rhythmFn from './rhythm.js'

export const rhythm = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length
		const beats = params.beats[0] | 0
		const bars = Math.max(1, Math.ceil((n / ctx.sampleRate) * params.bpm[0] / 60 / beats))
		const d = rhythmFn({
			bpm: params.bpm[0], bars, beats, fs: ctx.sampleRate,
			freq: params.freq[0], accentFreq: params.accentFreq[0], amp: params.amp[0],
		})
		const m = Math.min(n, d.length)
		for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
	}
}
rhythm.channels = { inputs: [], outputs: 'any' }
rhythm.streaming = false
rhythm.params = {
	bpm:        { type: 'number', min: 20, max: 300, default: 120 },
	beats:      { type: 'number', min: 1, max: 12, default: 4, step: 1 },
	freq:       { type: 'number', min: 200, max: 4000, default: 1000, unit: 'Hz' },
	accentFreq: { type: 'number', min: 200, max: 6000, default: 1500, unit: 'Hz' },
	amp:        { type: 'number', min: 0, max: 1, default: 0.7 },
}
