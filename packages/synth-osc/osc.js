// Oscillator — classic waveforms, band-limited (blep.js), with detune.

import { wave } from './blep.js'

export { wave }

const TYPES = ['sine', 'square', 'sawtooth', 'triangle']

/**
 * @param {number} freq — Hz
 * @param {object} opts — { duration=1 (s), fs=44100, type='sine'|'square'|'sawtooth'|'triangle',
 *   amp=0.8, detune=0 (cents), phase=0 (0..1), wave: custom t=>v (rendered as given, not band-limited) }
 * @returns {Float32Array}
 */
export default function osc (freq, { duration = 1, fs = 44100, type = 'sine', amp = 0.8, detune = 0, phase = 0, wave: fn } = {}) {
	if (!fn && !TYPES.includes(type)) throw new RangeError(`osc: unknown type "${type}"`)
	let f = freq * 2 ** (detune / 1200)
	let n = Math.round(duration * fs)
	let d = new Float32Array(n)
	let dt = f / fs
	for (let i = 0; i < n; i++) {
		let t = (phase + i * dt) % 1
		if (t < 0) t += 1
		d[i] = amp * (fn ? fn(t) : wave(type, t, dt))
	}
	return d
}
