// Karplus-Strong plucked string — noise burst into an averaging delay loop
// (Karplus & Strong 1983). Decay via loss factor, brightness via initial noise color.

export default function pluck (freq, { fs = 44100, duration = 1, amp = 0.7, damp = 0.996, seed = 1 } = {}) {
	let N = Math.max(2, Math.round(fs / freq))
	let buf = new Float32Array(N)
	let s = seed >>> 0 || 1
	for (let i = 0; i < N; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; buf[i] = amp * (s / 0x3fffffff - 1) }
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	let idx = 0
	for (let i = 0; i < n; i++) {
		out[i] = buf[idx]
		buf[idx] = damp * 0.5 * (buf[idx] + buf[(idx + 1) % N])
		idx = (idx + 1) % N
	}
	return out
}
