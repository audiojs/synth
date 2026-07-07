// Drum synthesis — membrane (pitch-dropping sine kick), metal (inharmonic square-ish
// cymbal), noise (snare/hat band noise), Tone.js MembraneSynth/MetalSynth/NoiseSynth class.

export function membrane ({ freq = 55, drop = 3, duration = 0.5, fs = 44100, amp = 0.9 } = {}) {
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	let phase = 0
	for (let i = 0; i < n; i++) {
		let t = i / n
		let f = freq * (1 + drop * Math.exp(-t * 9))
		phase += 2 * Math.PI * f / fs
		out[i] = amp * Math.exp(-t * 6) * Math.sin(phase)
	}
	return out
}

export function metal ({ freq = 200, duration = 0.6, fs = 44100, amp = 0.5 } = {}) {
	const RATIOS = [1, 1.483, 1.932, 2.546, 2.63, 3.897] // classic FM-bell inharmonic set
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	for (let r of RATIOS) for (let i = 0; i < n; i++) out[i] += (amp / RATIOS.length) * Math.exp(-i / n * 8) * Math.sign(Math.sin(2 * Math.PI * freq * r * i / fs))
	return out
}

export function noiseDrum ({ duration = 0.25, fs = 44100, amp = 0.7, seed = 9 } = {}) {
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	let s = seed
	for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; out[i] = amp * (s / 0x3fffffff - 1) * Math.exp(-i / n * 7) }
	return out
}

export default membrane
