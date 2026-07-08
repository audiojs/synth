// Polyphonic voice allocator — renders note events through any voice function with
// N-voice polyphony, oldest-note stealing, and per-note velocity. The voice is a plain
// synthesis function (freq, {fs, duration, velocity}) → Float32Array, so every @audio
// generator (osc, pluck, drum, wavetable…) is a valid voice.

/**
 * @param {Array} notes — [{ time, freq | midi, duration, velocity=1 }]
 * @param {object} opts — {
 *   voice: (freq, { fs, duration, velocity }) => Float32Array — required,
 *   voices: 16 — max simultaneous notes (oldest is stolen with a 5 ms fade),
 *   duration — total seconds (default: end of last note + 0.5),
 *   fs: 44100
 * }
 * @returns {Float32Array} mono mix
 */
export default function poly (notes, { voice, voices = 16, duration, fs = 44100 } = {}) {
	if (typeof voice !== 'function') throw new TypeError('poly: opts.voice function is required')
	let evs = [...notes].map(n => ({
		time: n.time ?? 0,
		freq: n.freq ?? 440 * 2 ** (((n.midi ?? 69) - 69) / 12),
		duration: n.duration ?? 0.5,
		velocity: n.velocity ?? 1,
	})).sort((a, b) => a.time - b.time)

	// render every note, then simulate allocation to decide steals (cut = absolute sample
	// where the note is silenced; stolen notes get a short fade there instead of a click)
	let rendered = evs.map(e => {
		let d = voice(e.freq, { fs, duration: e.duration, velocity: e.velocity })
		let at = Math.round(e.time * fs)
		return { at, data: d, cut: at + d.length, velocity: e.velocity }
	})
	let active = []
	for (let r of rendered) {
		active = active.filter(a => a.cut > r.at)
		if (active.length >= voices) {
			let oldest = active.reduce((m, a) => a.at < m.at ? a : m)
			oldest.cut = r.at
			active = active.filter(a => a !== oldest)
		}
		active.push(r)
	}

	let end = duration != null ? Math.ceil(duration * fs)
		: rendered.length ? Math.max(...rendered.map(r => r.cut)) + Math.round(0.5 * fs) : fs
	let out = new Float32Array(end)
	let fade = Math.round(0.005 * fs)

	for (let r of rendered) {
		let n = Math.min(r.data.length, r.cut - r.at, out.length - r.at)
		for (let i = 0; i < n; i++) {
			let g = r.velocity
			if (r.cut - r.at < r.data.length && i > n - fade) g *= (n - i) / fade   // steal fade
			out[r.at + i] += r.data[i] * g
		}
	}
	return out
}
