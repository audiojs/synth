// LFO — low-frequency control signal (sine/triangle/square/saw), bipolar or unipolar.

export default function lfo (freq = 2, { duration = 1, fs = 44100, type = 'sine', unipolar = false, phase = 0 } = {}) {
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	for (let i = 0; i < n; i++) {
		let t = (phase + freq * i / fs) % 1
		let v = type === 'triangle' ? 1 - 4 * Math.abs(t - 0.5) :
			type === 'square' ? (t < 0.5 ? 1 : -1) :
			type === 'saw' ? 2 * t - 1 :
			Math.sin(2 * Math.PI * t)
		out[i] = unipolar ? (v + 1) / 2 : v
	}
	return out
}
