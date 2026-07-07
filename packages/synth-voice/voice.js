// Synth voice — oscillator × ADSR envelope through a one-pole lowpass with envelope-scaled
// cutoff (Tone.js Synth/MonoSynth class), composed from @audio/synth-osc + synth-envelope.

import osc from '@audio/synth-osc'
import adsr from '@audio/synth-envelope'

export default function voice (freq, { fs = 44100, type = 'sawtooth', duration = 0.6,
	attack = 0.01, decay = 0.15, sustain = 0.6, release = 0.25,
	cutoff = 3000, envAmount = 0.6, amp = 0.7 } = {}) {
	let env = adsr({ attack, decay, sustain, release, duration, fs })
	let src = osc(freq, { duration: env.length / fs, fs, type, amp: 1 })
	let out = new Float32Array(env.length)
	let lp = 0
	for (let i = 0; i < env.length; i++) {
		let fc = cutoff * (1 - envAmount + envAmount * env[i])
		let a = Math.exp(-2 * Math.PI * fc / fs)
		lp = src[i] * env[i] * (1 - a) + lp * a
		out[i] = amp * lp
	}
	return out
}
