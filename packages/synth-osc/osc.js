// Oscillator — classic waveforms rendered from periodic-function (scijs), with detune.

import { sine, square, sawtooth, triangle } from 'periodic-function'

const WAVES = { sine, square, sawtooth, triangle }

/**
 * @param {number} freq — Hz
 * @param {object} opts — { duration=1 (s), fs=44100, type='sine'|'square'|'sawtooth'|'triangle',
 *   amp=0.8, detune=0 (cents), phase=0 (0..1), wave: custom t=>v }
 * @returns {Float32Array}
 */
export default function osc (freq, { duration = 1, fs = 44100, type = 'sine', amp = 0.8, detune = 0, phase = 0, wave } = {}) {
	let fn = wave || WAVES[type]
	if (!fn) throw new RangeError(`osc: unknown type "${type}"`)
	let f = freq * 2 ** (detune / 1200)
	let n = Math.round(duration * fs)
	let d = new Float32Array(n)
	let t = phase
	let dt = f / fs
	for (let i = 0; i < n; i++) {
		d[i] = amp * fn(t % 1)
		t += dt
	}
	return d
}
