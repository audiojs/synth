// Chirp — frequency sweep generator. Exponential (log) sweep is the ESS measurement
// signal (Farina 2000, used by @audio/measure-ir); linear sweep for response plots.
// Instantaneous frequency: lin f(t) = f0 + (f1−f0)·t/T · exp f(t) = f0·(f1/f0)^(t/T).

/**
 * @param {object} opts — { f0=20, f1=fs/2·0.95, duration=1, fs=44100,
 *   method='exp'|'lin', amp=0.9, fade=0.005 (s edge fades against clicks) }
 * @returns {Float32Array}
 */
export default function chirp ({ f0 = 20, f1, duration = 1, fs = 44100, method = 'exp', amp = 0.9, fade = 0.005 } = {}) {
	f1 ||= fs / 2 * 0.95
	let n = Math.round(duration * fs)
	let d = new Float32Array(n)
	if (method === 'exp') {
		let L = duration / Math.log(f1 / f0)
		for (let i = 0; i < n; i++) {
			let t = i / fs
			d[i] = amp * Math.sin(2 * Math.PI * f0 * L * (Math.exp(t / L) - 1))
		}
	} else {
		let k = (f1 - f0) / duration
		for (let i = 0; i < n; i++) {
			let t = i / fs
			d[i] = amp * Math.sin(2 * Math.PI * (f0 * t + k * t * t / 2))
		}
	}
	let fadeN = Math.max(1, Math.round(fade * fs))
	for (let i = 0; i < fadeN && i < n; i++) {
		let g = 0.5 - 0.5 * Math.cos(Math.PI * i / fadeN)
		d[i] *= g
		d[n - 1 - i] *= g
	}
	return d
}
