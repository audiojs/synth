// ADSR envelope generator — returns a gain contour (attack/decay linear, release exp-ish),
// to multiply onto any source (gain, filter cutoff, amplitude).

export default function adsr ({ attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.3, duration = 1, fs = 44100 } = {}) {
	let n = Math.round((duration + release) * fs)
	let out = new Float32Array(n)
	let aN = Math.round(attack * fs), dN = Math.round(decay * fs), susEnd = Math.round(duration * fs)
	for (let i = 0; i < n; i++) {
		if (i < aN) out[i] = i / (aN || 1)
		else if (i < aN + dN) out[i] = 1 - (1 - sustain) * (i - aN) / (dN || 1)
		else if (i < susEnd) out[i] = sustain
		else out[i] = sustain * Math.exp(-3 * (i - susEnd) / (n - susEnd || 1))
	}
	return out
}
