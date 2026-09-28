// atom manifest: tonewheel organ driven by contract note events. Generator + whole-render:
// the host compiles a `notes` option into §events slots; on/off pairs become the kernel's
// note list, so tonewheels are shared across held keys and the percussion single-triggers
// across the whole performance, as on the instrument. Notes outside the manual (MIDI
// 36..96) are dropped. Drawbar n is the service manual's numbering: 1 = 16', 9 = 1'.

import tonewheelFn, { LOWEST, HIGHEST } from './tonewheel.js'

const REGISTRATION = [8, 8, 8, 0, 0, 0, 0, 0, 0]

export const tonewheel = (ctx) => (inputs, outputs, params) => {
	const out = outputs[0]
	if (!out || !out.length) return
	const n = out[0].length, sr = ctx.sampleRate
	const evs = ctx.events || [], on = new Map(), notes = []
	for (const e of evs) {
		if (e.kind === 'on') on.set(e.id, e)
		else if (e.kind === 'off' && on.has(e.id)) {
			const s = on.get(e.id)
			notes.push({ time: s.time / sr, midi: s.pitch, duration: (e.time - s.time) / sr })
			on.delete(e.id)
		}
	}
	for (const s of on.values()) notes.push({ time: s.time / sr, midi: s.pitch, duration: (n - s.time) / sr })
	const keys = notes.filter(k => k.midi >= LOWEST && k.midi <= HIGHEST && k.duration > 0)
	for (const o of out) o.fill(0)
	if (!keys.length) return
	const d = tonewheelFn(keys, {
		drawbars: REGISTRATION.map((_, i) => Math.round(params['drawbar' + (i + 1)][0])),
		fs: sr, amp: params.amp[0], click: params.click[0],
		percussion: params.percussion === 'off' ? false : params.percussion,
		percussionDecay: params.percussionDecay, percussionVolume: params.percussionVolume,
		vibrato: params.vibrato === 'off' ? false : params.vibrato,
	})
	const m = Math.min(n, d.length)
	for (const o of out) o.set(d.subarray(0, m))
}
tonewheel.channels = { inputs: [], outputs: 'any' }
tonewheel.streaming = false
tonewheel.events = { in: ['note'] }
tonewheel.params = {
	...Object.fromEntries(REGISTRATION.map((v, i) => ['drawbar' + (i + 1), { type: 'number', min: 0, max: 8, default: v, step: 1 }])),
	percussion:       { type: 'enum', values: ['off', 'second', 'third'], default: 'off' },
	percussionDecay:  { type: 'enum', values: ['fast', 'slow'], default: 'fast' },
	percussionVolume: { type: 'enum', values: ['normal', 'soft'], default: 'normal' },
	vibrato:          { type: 'enum', values: ['off', 'v1', 'v2', 'v3', 'c1', 'c2', 'c3'], default: 'off' },
	click:            { type: 'number', min: 0, max: 1, default: 1 },
	amp:              { type: 'number', min: 0, max: 1, default: 0.8 },
}
