// Morphing wavetable oscillator (WaveEdit class) — crossfade through a bank of
// single-cycle tables while scanning position 0..1; linear interp within and between tables.

export default function wavetable (freq, { tables, position = 0, duration = 1, fs = 44100, amp = 0.8 } = {}) {
	if (!tables?.length) throw new RangeError('wavetable: opts.tables required (array of single-cycle Float32Arrays)')
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	let posFn = typeof position === 'function' ? position : () => position
	let t = 0, dt = freq / fs
	for (let i = 0; i < n; i++) {
		let p = Math.min(1, Math.max(0, posFn(i / n))) * (tables.length - 1)
		let ti = Math.min(tables.length - 2, Math.floor(p))
		let tf = tables.length > 1 ? p - ti : 0
		let read = tbl => {
			let x = t * tbl.length
			let i0 = x | 0, frac = x - i0
			return tbl[i0 % tbl.length] * (1 - frac) + tbl[(i0 + 1) % tbl.length] * frac
		}
		let a = read(tables[ti])
		let b = tables.length > 1 ? read(tables[ti + 1]) : a
		out[i] = amp * (a * (1 - tf) + b * tf)
		t = (t + dt) % 1
	}
	return out
}
