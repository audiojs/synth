// Game/UI sound-effect generator (ZZFX/sfxr class) — one parameterized synthesis
// pipeline: shaped oscillator → freq slide/vibrato → ADSR-ish envelope → optional
// noise/bitcrush/lowpass. Named presets cover the sfxr archetypes; every field is
// overridable, deterministic (seeded noise) so renders are reproducible.

let { sin, PI, abs, exp, sign } = Math

export const PRESETS = {
	pickup: { freq: 900, slide: 4, attack: 0.001, sustain: 0.05, release: 0.15, shape: 'square', arp: 1.5, arpAt: 0.06 },
	laser: { freq: 1400, slide: -8, attack: 0.001, sustain: 0.08, release: 0.12, shape: 'saw' },
	explosion: { freq: 120, slide: -2, attack: 0.005, sustain: 0.2, release: 0.6, shape: 'noise', lowpass: 1200 },
	powerup: { freq: 300, slide: 5, attack: 0.005, sustain: 0.25, release: 0.2, shape: 'square', vibrato: 8, vibratoDepth: 0.15 },
	hit: { freq: 250, slide: -6, attack: 0.001, sustain: 0.04, release: 0.1, shape: 'noise', lowpass: 3000 },
	jump: { freq: 350, slide: 3.5, attack: 0.002, sustain: 0.1, release: 0.12, shape: 'square' },
	blip: { freq: 700, attack: 0.001, sustain: 0.03, release: 0.04, shape: 'square' },
	coin: { freq: 1100, attack: 0.001, sustain: 0.04, release: 0.25, shape: 'sine', arp: 1.335, arpAt: 0.08 },
}

/**
 * @param {string|object} preset — preset name or full parameter object
 * @param {object} opts — overrides + { fs = 44100, amp = 0.8, seed }
 * @returns {Float32Array}
 */
export default function sfx (preset = 'blip', opts = {}) {
	let p = { ...(typeof preset === 'string' ? PRESETS[preset] : preset), ...opts }
	if (typeof preset === 'string' && !PRESETS[preset]) throw new RangeError(`sfx: unknown preset "${preset}"`)
	let fs = p.fs ?? 44100
	let amp = p.amp ?? 0.8
	let attack = p.attack ?? 0.005, sustain = p.sustain ?? 0.08, release = p.release ?? 0.12
	let shape = p.shape ?? 'square'
	let slide = p.slide ?? 0                 // octaves/second exponential slide
	let vib = p.vibrato ?? 0                 // Hz
	let vibDepth = p.vibratoDepth ?? 0.1
	let arp = p.arp ?? 0                     // frequency multiplier stepped at arpAt
	let arpAt = p.arpAt ?? 0.05
	let lowpass = p.lowpass ?? 0
	let crush = p.crush ?? 0                 // 0..1 bitcrush

	let n = Math.ceil((attack + sustain + release) * fs)
	let out = new Float32Array(n)
	let rnd = (p.seed ?? 0x1234abcd) >>> 0
	let noise = () => ((rnd = (rnd * 1664525 + 1013904223) >>> 0) / 2147483648 - 1)
	let phase = 0, lp = 0
	let aLp = lowpass > 0 ? 1 - exp(-2 * PI * lowpass / fs) : 1

	for (let i = 0; i < n; i++) {
		let t = i / fs
		let f = (p.freq ?? 440) * 2 ** (slide * t)
		if (arp && t > arpAt) f *= arp ** Math.min(2, Math.floor(t / arpAt))
		if (vib) f *= 1 + vibDepth * sin(2 * PI * vib * t)

		phase += f / fs
		let ph = phase % 1
		let s = shape === 'sine' ? sin(2 * PI * ph)
			: shape === 'square' ? (ph < 0.5 ? 1 : -1) * 0.7
			: shape === 'saw' ? (2 * ph - 1) * 0.8
			: shape === 'triangle' ? (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph)
			: noise()

		// envelope: linear attack, flat sustain, exponential release
		let env = t < attack ? t / attack
			: t < attack + sustain ? 1
			: exp(-4 * (t - attack - sustain) / release)

		let x = s * env
		if (crush > 0) { let steps = 2 ** (2 + (1 - crush) * 10); x = Math.round(x * steps) / steps }
		lp += aLp * (x - lp)
		out[i] = (lowpass > 0 ? lp : x) * amp
	}
	return out
}
