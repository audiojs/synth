// Tonewheel organ (Hammond B-3/C-3 upper manual): 91 tonewheels driven through 12 gear
// ratios, nine drawbars on the matching-transformer taps, foldback, single-trigger
// percussion, key click and the vibrato/chorus scanner. Sources, per constant:
//
//  [SM]  Hammond Organ Service Manual, early models (A, B, C series, B-3, C-3, A-100 …),
//        archive.org/details/HammondOrganServiceManual-EarlyModelsabcSeriesB3A-100RtDG
//  [PAT] L. Hammond, US Patent 1,956,350, "Electrical musical instrument" (1934), p. 12
//  [HW]  HammondWiki, "Gear Ratio", dairiki.org/HammondWiki/GearRatio
//  [FAQ] M. Mercier, B. Dodds, The Hammond-Leslie FAQ, ed. 1.4.2 (2000)
//  [SBF] setBfree tonegen.c (GPL-2.0-or-later), github.com/pantherb/setBfree: values only,
//        where no Hammond document gives one

const TAU = 2 * Math.PI

// Drawbars in panel order, footage and interval above the key's 8' pitch in semitones:
// 16' 5⅓' 8' 4' 2⅔' 2' 1⅗' 1⅓' 1' [SM Table III "Frequency numbers assigned to keys"].
export const FOOTAGE = ['16', '5 1/3', '8', '4', '2 2/3', '2', '1 3/5', '1 1/3', '1']
export const OFFSET = [-12, 7, 0, 12, 19, 24, 28, 31, 36]

// Drawbar level law: positions 1..8 connect to matching-transformer taps at 6, 8, 11, 16,
// 22, 32, 45 and 64 turns, "the nearest whole numbers to a geometrical series commencing
// with 6 and having the square root of 2 as a ratio"; voltage ∝ turns [PAT]. About 3 dB per
// step. Later transformers revised the first three taps [SM "Matching Transformers"]; the
// revised turns are not published.
export const TAPS = [0, 6, 8, 11, 16, 22, 32, 45, 64]
export const level = (n) => TAPS[n] / 64

// Gear ratios C..B of the 60 Hz generator, driving/driven teeth [HW], as effective ratios in
// f = 20 rev/s · teeth · ratio: HW's table halves F..B (A 66/96) while its worked example
// uses A 88/64 → 440 Hz; setBfree's gears60ratios carries the same values [SBF]. The drive
// shaft turns at the synchronous motor's 1200 rpm [SM §5-12]; wheels carry 2, 4, …, 128
// teeth, and the top seven (C..F#) 192 teeth on the F..B shafts [SM §5-5, HW].
const GEARS = [[85, 104], [71, 82], [67, 73], [35, 36], [69, 67], [12, 11], [37, 32], [49, 40], [48, 37], [11, 8], [67, 46], [54, 35]]

/** Tonewheel frequency, Hz, wheel 1..91 (frequency numbers of [SM]; wheel 46 = A 440). */
export function wheelHz (w) {
	if (w < 1 || w > 91) throw new RangeError(`tonewheel: no wheel ${w}`)
	let n = (w - 1) % 12, oct = Math.floor((w - 1) / 12)
	let [a, b] = w > 84 ? GEARS[n + 5] : GEARS[n]
	return 20 * a / b * (w > 84 ? 192 : 2 << oct)
}

/** Manual range: 61 keys, C2..C7 at 8' (MIDI 36..96), key 1 = wheel 13 at 8' [SM Table III]. */
export const LOWEST = 36, HIGHEST = 96

/**
 * Wheel sounding on drawbar d (0..8) of MIDI key `midi`, with foldback [SM Table III]: the
 * 16' of the bottom octave repeats the octave above (wheels 1..12 serve the pedals only),
 * and wheels past 91 repeat an octave lower.
 */
export function wheel (midi, d) {
	if (!(midi >= LOWEST && midi <= HIGHEST)) throw new RangeError(`tonewheel: key ${midi} outside the manual (MIDI ${LOWEST}..${HIGHEST})`)
	let w = midi - 23 + OFFSET[d]
	if (w < 13) w += 12
	while (w > 91) w -= 12
	return w
}

/** '88 8000 000' or [8, 8, 8, 0, 0, 0, 0, 0, 0] → nine integers 0..8 */
export function registration (drawbars) {
	let r = typeof drawbars === 'string' ? [...drawbars.replace(/[\s-]/g, '')].map(Number) : Array.from(drawbars)
	if (r.length !== 9 || r.some(n => !(Number.isInteger(n) && n >= 0 && n <= 8))) throw new RangeError(`tonewheel: drawbars must be nine digits 0..8, got ${drawbars}`)
	return r
}

// Percussion [SM p. 2-36..2-38]: borrows the 2nd (4') or 3rd (2⅔') harmonic bus; single
// trigger: fires only on a key pressed with all keys up; the 1' drawbar goes silent (its
// contacts key the circuit); "normal" volume cuts the organ signal (R1), "soft" restores it
// and cuts the percussion; "fast" raises the percussion output about 50%; added after the
// scanner. Decay to inaudible: fast about 1 s, slow about 4 s [FAQ], taken as −60 dB [SBF].
// Unsourced in Hammond documents, from [SBF]: percussion peak 3 × a drawbar at 8 (fast;
// slow = 3 / 1.5 per the 50%), soft × 0.5012, normal organ cut × 0.60512.
export const PERCUSSION = {
	drawbar: { second: 3, third: 4 }, // 4' and 2⅔'
	t60: { fast: 1, slow: 4 }, // s
	peak: { fast: 3, slow: 2 }, // × a drawbar at 8
	soft: 0.5012, organCut: 0.60512,
}

// Vibrato scanner [SM "The Hammond Vibrato"]: a 16-plate capacitive pickup driven at 412
// rpm sweeps the delay line up and back once per turn; the whole line (V3) shifts pitch
// about 1.5% while it takes half a turn, so its delay is 0.015 · 60/(2·412) s; V2 scans
// about half the line, V1 about a third. Chorus mixes undelayed signal with the vibrato;
// the equal mix is an assumption (the manual gives no ratio).
export const SCANNER = { hz: 412 / 60, line: 0.015 * 60 / (2 * 412), depth: { v1: 1 / 3, v2: 1 / 2, v3: 1, c1: 1 / 3, c2: 1 / 2, c3: 1 } }

const CLICK_RAMP = 0.005 // s, key contact ramp at click 0 (unsourced; click 1 = instant contact)

// tonewheel phases: fixed, spread by the golden-ratio sequence (the real ones are arbitrary)
const phase = (w) => TAU * ((w * 0.6180339887498949) % 1)

// notes: number (Hz) | number[] (chord) | [{ time, freq | midi, duration }]
function keys (input, duration) {
	let list = typeof input === 'number' ? [input] : input
	return list.map(n => {
		let o = typeof n === 'number' ? { freq: n } : n
		let midi = o.midi ?? Math.round(69 + 12 * Math.log2(o.freq / 440))
		wheel(midi, 2) // range check
		return { midi, on: o.time ?? 0, off: (o.time ?? 0) + (o.duration ?? duration) }
	})
}

/**
 * @param {number|number[]|object[]} notes: Hz of one key, an array of Hz (keys pressed
 *   together), or [{ time, freq | midi, duration }]; each lands on the nearest manual key
 * @param {object} opts
 * @returns {Float32Array}
 */
export default function tonewheel (notes = 261.63, {
	drawbars = '888000000', duration = 1, fs = 44100, amp = 0.8,
	percussion = false, percussionDecay = 'fast', percussionVolume = 'normal',
	click = 1, vibrato = false,
} = {}) {
	let reg = registration(drawbars)
	let ks = keys(notes, duration)
	let scan = vibrato ? SCANNER.depth[vibrato] : 0
	if (vibrato && !scan) throw new RangeError(`tonewheel: vibrato must be v1, v2, v3, c1, c2 or c3, got ${vibrato}`)
	let perc = percussion ? PERCUSSION.drawbar[percussion] : -1
	if (percussion && perc == null) throw new RangeError(`tonewheel: percussion must be 'second' or 'third', got ${percussion}`)
	if (perc >= 0 && !PERCUSSION.t60[percussionDecay]) throw new RangeError(`tonewheel: percussionDecay must be 'fast' or 'slow', got ${percussionDecay}`)
	if (perc >= 0 && percussionVolume !== 'normal' && percussionVolume !== 'soft') throw new RangeError(`tonewheel: percussionVolume must be 'normal' or 'soft', got ${percussionVolume}`)

	let depth = scan * SCANNER.line * fs // samples of delay swept by the scanner
	let end = Math.round(Math.max(...ks.map(k => k.off)) * fs)
	let n = end + (scan ? Math.ceil(depth) + 2 : 0)
	let organ = new Float64Array(n), percOut = perc >= 0 ? new Float64Array(n) : null

	// tonewheel signals, one per wheel, shared by every key and drawbar that taps it
	let wheels = new Map()
	const signal = (w) => {
		let s = wheels.get(w)
		if (s) return s
		s = new Float64Array(end)
		let dw = TAU * wheelHz(w) / fs, ph = phase(w)
		for (let i = 0; i < end; i++) s[i] = Math.sin(dw * i + ph)
		wheels.set(w, s)
		return s
	}

	// key contacts: instant at click 1, a raised-cosine ramp at click 0
	let ramp = Math.round((1 - Math.max(0, Math.min(1, click))) * CLICK_RAMP * fs)
	for (let k of ks) {
		k.i0 = Math.round(k.on * fs); k.i1 = Math.round(k.off * fs)
		k.gate = new Float64Array(k.i1 - k.i0)
		for (let i = 0; i < k.gate.length; i++) {
			let m = Math.min(i, k.gate.length - 1 - i)
			k.gate[i] = m >= ramp ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * (m + 0.5) / (ramp + 1))
		}
	}

	let organGain = perc >= 0 && percussionVolume === 'normal' ? PERCUSSION.organCut : 1
	for (let k of ks) for (let d = 0; d < 9; d++) {
		if (!reg[d] || (perc >= 0 && d === 8)) continue
		let s = signal(wheel(k.midi, d)), g = level(reg[d]) * organGain
		for (let i = k.i0; i < k.i1; i++) organ[i] += g * k.gate[i - k.i0] * s[i]
	}

	if (perc >= 0) {
		// single trigger: the envelope restarts only for a key pressed while every key is up
		let env = new Float64Array(end), peak = PERCUSSION.peak[percussionDecay] * (percussionVolume === 'soft' ? PERCUSSION.soft : 1)
		let decay = Math.exp(-Math.log(1000) / (PERCUSSION.t60[percussionDecay] * fs))
		let trig = new Set(ks.filter(k => !ks.some(j => j.i0 < k.i0 && j.i1 > k.i0)).map(k => k.i0))
		for (let i = 0, e = 0; i < end; i++) env[i] = e = trig.has(i) ? peak : e * decay
		for (let k of ks) {
			let s = signal(wheel(k.midi, perc))
			for (let i = k.i0; i < k.i1; i++) percOut[i] += env[i] * k.gate[i - k.i0] * s[i]
		}
	}

	let out = new Float32Array(n), g = amp / 9 // one key, nine drawbars at 8: peak ≤ amp
	if (scan) {
		// fractional delay d(t) = depth · triangle(scanner phase), cubic Hermite read
		let mix = vibrato[0] === 'c' ? 0.5 : 0
		for (let i = 0; i < n; i++) {
			let x = (SCANNER.hz * i / fs) % 1
			let pos = i - depth * (x < 0.5 ? 2 * x : 2 - 2 * x)
			let j = Math.floor(pos), f = pos - j
			let ym1 = organ[j - 1] || 0, y0 = organ[j] || 0, y1 = organ[j + 1] || 0, y2 = organ[j + 2] || 0
			let c1 = 0.5 * (y1 - ym1), c2 = ym1 - 2.5 * y0 + 2 * y1 - 0.5 * y2, c3 = 0.5 * (y2 - ym1) + 1.5 * (y0 - y1)
			let wet = ((c3 * f + c2) * f + c1) * f + y0
			out[i] = g * (mix * organ[i] + (1 - mix) * wet + (percOut ? percOut[i] : 0))
		}
	} else for (let i = 0; i < n; i++) out[i] = g * (organ[i] + (percOut ? percOut[i] : 0))
	return out
}
