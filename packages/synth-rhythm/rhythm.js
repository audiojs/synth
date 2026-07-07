// Rhythm / click track — decaying tone bursts on a BPM grid, accented downbeats.

export default function rhythm ({ bpm = 120, bars = 4, beats = 4, fs = 44100, freq = 1000, accentFreq = 1500, amp = 0.7 } = {}) {
	let spb = 60 / bpm
	let n = Math.round(bars * beats * spb * fs)
	let out = new Float32Array(n)
	for (let b = 0; b < bars * beats; b++) {
		let at = Math.round(b * spb * fs)
		let f = b % beats === 0 ? accentFreq : freq
		let a = b % beats === 0 ? amp : amp * 0.7
		for (let i = 0; i < 900 && at + i < n; i++) out[at + i] += a * Math.sin(2 * Math.PI * f * i / fs) * Math.exp(-i / 250)
	}
	return out
}
