// audio.js manifest — monophonic synth voice (osc × ADSR through env-scaled lowpass,
// Tone.js Synth/MonoSynth class) driven by contract note events. Generator +
// whole-render: the host compiles a `notes` option into §events slots and calls
// process once over the materialized timeline. Notes are rendered independently and
// overlap-added (a mono line rarely overlaps; no voice stealing in v1 — use
// @audio/synth-poly for allocation).

import voiceFn from './voice.js'

export const voice = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length, sr = ctx.sampleRate
		const o0 = out[0]
		o0.fill(0)
		// reconstruct notes from on/off slot pairs (host pairs them by id)
		const evs = ctx.events || []
		const on = new Map()
		const render = (slot, endSample) => {
			const freq = midiToHz(slot.pitch)
			const dur = Math.max(0.01, (endSample - slot.time) / sr)
			const d = voiceFn(freq, {
				fs: sr, duration: dur,
				type: params.type,
				attack: params.attack[0], decay: params.decay[0],
				sustain: params.sustain[0], release: params.release[0],
				cutoff: params.cutoff[0], envAmount: params.envAmount[0],
				amp: params.amp[0] * (slot.velocity ?? 1),
			})
			for (let i = 0; i < d.length && slot.time + i < n; i++) o0[slot.time + i] += d[i]
		}
		for (let i = 0; i < evs.length; i++) {
			const e = evs[i]
			if (e.kind === 'on') on.set(e.id, { time: e.time, pitch: e.pitch, velocity: e.velocity })
			else if (e.kind === 'off' && on.has(e.id)) { render(on.get(e.id), e.time); on.delete(e.id) }
		}
		for (const slot of on.values()) render(slot, n)  // unterminated notes ring to the end
		for (let c = 1; c < out.length; c++) out[c].set(o0)
	}
}
voice.channels = { inputs: [], outputs: 'any' }
voice.streaming = false
voice.events = { in: ['note'] }
voice.params = {
	type:      { type: 'enum', values: ['sine', 'square', 'sawtooth', 'triangle'], default: 'sawtooth' },
	attack:    { type: 'number', min: 0.001, max: 2, default: 0.01, unit: 's', curve: 'log' },
	decay:     { type: 'number', min: 0.001, max: 2, default: 0.15, unit: 's', curve: 'log' },
	sustain:   { type: 'number', min: 0, max: 1, default: 0.6 },
	release:   { type: 'number', min: 0.001, max: 4, default: 0.25, unit: 's', curve: 'log' },
	cutoff:    { type: 'number', min: 100, max: 16000, default: 3000, unit: 'Hz', curve: 'log' },
	envAmount: { type: 'number', min: 0, max: 1, default: 0.6 },
	amp:       { type: 'number', min: 0, max: 1, default: 0.7 },
}
