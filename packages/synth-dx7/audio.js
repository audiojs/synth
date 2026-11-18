// audio.js manifest: the DX7 as a live instrument, contract 1.0. Sixteen voices of the MSFA engine (dx7.js), made
// once and reused, play note events as they arrive. Each voice keeps its own 64-frame block grid from its note-on
// frame, so a note sounds as the kernel renders it alone, sample for sample, wherever it starts in a call. An off
// releases at the voice's next 64-frame step, at most 63 frames after it: the engine's envelopes move once a step.
// The 145 parameters are the VCED voice's bytes, in its order (sysex.js PARAMS); the engine reads them all as a note
// starts (Dx7Note::init), so a change sounds from the next note on.

import { Voice, INIT, releaseTime } from './dx7.js'
import { PARAMS, SWITCH, MAX } from './sysex.js'

// the DX7 sounds 16 notes at once (DX7 Operating Manual, specifications; MSFA wiki Dx7Hardware: "6 operators x 16
// voice polyphony"; synth_unit.h max_active_notes = 16)
const VOICES = 16
const N = 64, SCALE = 2 ** -28 // the engine's block; dx7()'s output scale, 1.0 = MSFA's int16 full scale

const NAME = PARAMS.map(p => p[0]), SHIFT = PARAMS.map(p => p[2]), VALUES = PARAMS.map(p => typeof p[1] === 'number' ? null : p[1])

// the patch bytes of the values in force: a number less its display shift, an enum's index, a switch 0 or 1
function fill (patch, params) {
	for (let i = 0; i < 145; i++) {
		let v = params[NAME[i]], b = typeof v === 'boolean' ? +v : typeof v === 'string' ? VALUES[i].indexOf(v) : Math.round(v[0]) - SHIFT[i]
		patch[i] = b < 0 ? 0 : b > MAX[i] ? MAX[i] : b
	}
	return patch
}

export const dx7 = (ctx) => {
	const fs = ctx.sampleRate, patch = fill(Uint8Array.from(INIT), ctx.params), mix = new Float64Array(ctx.maxBlockSize)
	const voices = Array.from({ length: VOICES }, () => ({ voice: new Voice(patch, { fs }), buf: new Int32Array(N), at: N, id: -1, down: false, up: false, live: false, age: 0 }))
	let next = 0, ons = 0

	// MSFA SynthUnit::AllocateNote: from the voice after the last one taken, the first whose key is up, though its
	// release may still ring. With every key held upstream drops the new note; here the oldest held note gives way
	const take = () => {
		for (let i = 0, k = next; i < VOICES; i++, k = (k + 1) % VOICES) if (!voices[k].down) { next = (k + 1) % VOICES; return voices[k] }
		let old = voices[0]
		for (let k = 1; k < VOICES; k++) if (voices[k].age < old.age) old = voices[k]
		return old
	}
	// a voice's samples into mix[a..b): a new block when one is used up, a pending key-up before it; a released
	// voice that has gone silent for good is free and adds nothing more
	const play = (s, a, b) => {
		for (let i = a; i < b; i++) {
			if (s.at === N) {
				if (s.up) { s.voice.keyup(); s.up = false }
				else if (!s.down && s.voice.silent) { s.live = false; return }
				s.buf.fill(0); s.voice.block(s.buf); s.at = 0
			}
			mix[i] += s.buf[s.at++]
		}
	}
	const run = (a, b) => { for (let k = 0; k < VOICES; k++) if (voices[k].live) play(voices[k], a, b) }

	return (inputs, outputs, params) => {
		const out = outputs[0], n = out[0].length, evs = ctx.events
		fill(patch, params)
		mix.fill(0, 0, n)
		let f = 0
		for (let e = 0; e < evs.length; e++) {
			const ev = evs[e]
			if (ev.time > f) { run(f, ev.time); f = ev.time }
			if (ev.kind === 'on') {
				const s = take(), vel = ev.velocity < 0 ? 0 : ev.velocity > 1 ? 1 : ev.velocity
				s.voice.init(patch, ev.midi + patch[144] - 24, Math.round(vel * 127))
				s.id = ev.id; s.down = true; s.up = false; s.live = true; s.at = N; s.age = ++ons
			}
			else for (let k = 0; k < VOICES; k++) if (voices[k].down && voices[k].id === ev.id) { voices[k].down = false; voices[k].up = true; break }
		}
		run(f, n)
		for (let c = 0; c < out.length; c++) { const y = out[c]; for (let i = 0; i < n; i++) y[i] = mix[i] * SCALE }
	}
}
dx7.channels = { inputs: [], outputs: 'any' }
dx7.events = { in: ['note'] }
// numbers stepped by 1 over the byte's range as the DX7 displays it, enums by the manual's names; defaults: INIT VOICE
dx7.params = Object.fromEntries(PARAMS.map(([name, r, shift, unit], i) => [name,
	typeof r === 'number' ? { type: 'number', min: shift, max: r + shift, default: INIT[i] + shift, step: 1, ...unit && { unit } }
		: r === SWITCH ? { type: 'bool', default: INIT[i] === 1 } : { type: 'enum', values: r, default: r[INIT[i]] }]))
// the longest a released note rings at these values, from its off to exact silence: the engine's release time
// plus the up to 63 frames an off waits for its voice's next block
dx7.tail = ({ sampleRate, params }) => releaseTime(fill(new Uint8Array(155), params), { fs: sampleRate }) + (N - 1) / sampleRate
