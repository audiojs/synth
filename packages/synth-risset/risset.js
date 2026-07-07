// Risset drum — inharmonic partials + sine at ~an octave below + pitch-gliding noise band
// character, per Risset's classic catalogue (simplified: inharmonic partial set + decay).

const PARTIALS = [[1, 1], [1.6, 0.67], [2.2, 0.53], [2.3, 0.5], [2.9, 0.4]]

export default function risset (freq = 100, { fs = 44100, duration = 1.2, amp = 0.6 } = {}) {
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	for (let [ratio, a] of PARTIALS) {
		for (let i = 0; i < n; i++) {
			let t = i / fs
			out[i] += amp * a * Math.exp(-t * 4 / duration) * Math.sin(2 * Math.PI * freq * ratio * t)
		}
	}
	// sub sine an octave down, slower decay
	for (let i = 0; i < n; i++) out[i] += amp * 0.6 * Math.exp(-i / fs * 2.5 / duration) * Math.sin(Math.PI * freq * i / fs)
	let max = 0
	for (let v of out) max = Math.max(max, Math.abs(v))
	if (max > 0) for (let i = 0; i < n; i++) out[i] *= amp / max
	return out
}
