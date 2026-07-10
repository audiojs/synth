// audio.js manifest — polyphonic note renderer (N-voice allocation, oldest-note
// stealing) driven by contract note events, voiced by @audio/synth-voice. Generator +
// whole-render: the host compiles a `notes` option into §events slots; the manifest
// reconstructs the kernel's note list from on/off pairs and lets the kernel allocate.
// Custom voice functions (pluck, wavetable, …) take the kernel via direct import.

import polyFn from './poly.js'
import voiceFn from '@audio/synth-voice'

export const poly = (ctx) => {
	return (inputs, outputs, params) => {
		const out = outputs[0]
		if (!out || !out.length) return
		const n = out[0].length, sr = ctx.sampleRate
		const evs = ctx.events || []
		const on = new Map(), notes = []
		for (let i = 0; i < evs.length; i++) {
			const e = evs[i]
			if (e.kind === 'on') on.set(e.id, e)
			else if (e.kind === 'off' && on.has(e.id)) {
				const s = on.get(e.id)
				notes.push({ time: s.time / sr, midi: s.pitch, duration: (e.time - s.time) / sr, velocity: s.velocity ?? 1 })
				on.delete(e.id)
			}
		}
		for (const s of on.values()) notes.push({ time: s.time / sr, midi: s.pitch, duration: (n - s.time) / sr, velocity: s.velocity ?? 1 })
		const type = params.type, amp = params.amp[0]
		const d = polyFn(notes, {
			fs: sr, duration: n / sr,
			voices: params.voices[0] | 0,
			voice: (freq, o) => voiceFn(freq, { fs: o.fs, duration: o.duration, type, amp: amp * (o.velocity ?? 1) }),
		})
		const m = Math.min(n, d.length)
		for (let c = 0; c < out.length; c++) { out[c].set(d.subarray(0, m)); out[c].fill(0, m) }
	}
}
poly.channels = { inputs: [], outputs: 'any' }
poly.streaming = false
poly.events = { in: ['note'] }
poly.params = {
	voices: { type: 'number', min: 1, max: 32, default: 16, step: 1 },
	type:   { type: 'enum', values: ['sine', 'square', 'sawtooth', 'triangle'], default: 'sawtooth' },
	amp:    { type: 'number', min: 0, max: 1, default: 0.7 },
}
