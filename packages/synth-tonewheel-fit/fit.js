// Tonewheel registration from audio: the inverse of @audio/synth-tonewheel. Sustained organ
// audio (a key or a chord) → nine drawbar settings 0..8, a percussion guess and a score.
//
// 1. Wheel amplitudes: the keys fix which tonewheels can sound (drawbar wheels are ≥ 3
//    semitones apart within a key), so each wheel owns a log-frequency band reaching halfway
//    to its nearest neighbouring wheel, at most ±1.5 semitones; the band holds the wheel's
//    energy under the scanner's and a Leslie's frequency modulation. Band energy of Hann
//    STFT frames, sized per wheel for ≥ 2.5 bins per half band, gives an amplitude track.
// 2. Levels: nonnegative least squares (Lawson & Hanson 1974, Solving Least Squares
//    Problems, ch. 23) of the tracks against the tonewheel model, wheel = Σ keys·drawbars
//    tapping it; percussion hypotheses add a decaying column on the 4' or 2⅔' wheels and
//    drop the 1' (the percussion keys through its contacts); the lowest residual wins.
// 3. Quantization through the drawbar level law in dB: nearest tap, boundaries at the
//    geometric means of neighbouring taps. Without `amp` the loudest drawbar is taken as 8
//    and the gain is the one, within that bin, that puts every level closest to a tap.
// The scanner setting, given or detected, divides chorus out per wheel: dry plus a copy
// delayed uniformly over [0, D] averages to power (1 + sinc(2πfD))/2.

import { fft } from 'fourier-transform'
import { wheel, wheelHz, TAPS, OFFSET, PERCUSSION, SCANNER, LOWEST, HIGHEST } from '@audio/synth-tonewheel'

const HALF_BAND = 1.5 // semitones
const HOP = 0.02 // s, track step
const SKIP = 0.02 // s, key-contact click excluded at both ends
const FLOOR = 0.1, HELD = 0.5 // the note: 10 ms frames within −6 dB of the median of those within −20 dB of the loudest
const PREFER_NONE = 1.05 // a percussion hypothesis must cut the residual by 5% to be chosen

// log-domain quantizer: level r (1 = drawbar at 8) → 0..8
const EDGES = TAPS.map((t, n) => n < 8 ? Math.sqrt((n ? t : TAPS[1] ** 2 / TAPS[2]) * TAPS[n + 1]) / 64 : Infinity)
const quantize = (r) => { let n = 0; while (r >= EDGES[n]) n++; return n }

const HANN = new Map()
const hann = (L) => {
	let w = HANN.get(L)
	if (!w) { w = new Float64Array(L); for (let i = 0; i < L; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / L); HANN.set(L, w) }
	return w
}

// note span: a held organ note sits at a steady level; the reverb tail after key-up falls away
function span (chans, fs) {
	let f = Math.max(1, Math.round(0.01 * fs)), rms = []
	for (let i = 0; i + f <= chans[0].length; i += f) {
		let s = 0
		for (let x of chans) for (let j = i; j < i + f; j++) s += x[j] * x[j]
		rms.push(Math.sqrt(s / f))
	}
	let top = Math.max(...rms), loud = rms.filter(r => r >= FLOOR * top).sort((a, b) => a - b)
	let held = HELD * loud[loud.length >> 1]
	return [rms.findIndex(r => r >= held) * f, (rms.findLastIndex(r => r >= held) + 1) * f]
}

// the gain of a drawbar at 8 that snaps the levels to taps best, the loudest staying at 8
function unitOf (levels) {
	let top = Math.max(...levels), best = top, cost = Infinity
	for (let k = -16; k <= 16; k++) {
		let u = top * 10 ** (k / 200), c = 0 // 0.1 dB steps
		if (quantize(top / u) !== 8) continue
		for (let l of levels) { let n = quantize(l / u); if (n) c += Math.log(l / u * 64 / TAPS[n]) ** 2 }
		if (c < cost) { cost = c; best = u }
	}
	return best
}

// Welch power spectrum over [i0, i1), channel powers added
function welch (chans, i0, i1, L) {
	let w = hann(L), acc = new Float64Array(L / 2 + 1), frames = 0, buf = new Float64Array(L)
	for (let p = i0; p + L <= i1; p += L / 2, frames++) for (let x of chans) {
		for (let i = 0; i < L; i++) buf[i] = x[p + i] * w[i]
		let [re, im] = fft(buf)
		for (let k = 0; k <= L / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k]
	}
	for (let k = 0; k <= L / 2; k++) acc[k] /= frames || 1
	return acc
}

const pow2 = (n) => 2 ** Math.ceil(Math.log2(n))

// the key a single note was played on: the manual keys whose tonewheels collect the most
// spectral peak energy; among them the lowest whose 8' wheel sounds, the perceived pitch
function estimateKey (chans, fs, i0, i1) {
	let L = Math.min(pow2(0.37 * fs), 2 ** Math.floor(Math.log2(i1 - i0)))
	let P = welch(chans, i0, i1, L), semi = new Float64Array(140)
	for (let k = 2; k < P.length - 1; k++) {
		if (P[k] < P[k - 1] || P[k] < P[k + 1]) continue
		let m = Math.round(69 + 12 * Math.log2(k * fs / L / 440))
		if (m >= 0 && m < 140) semi[m] += P[k]
	}
	let keys = []
	for (let key = LOWEST; key <= HIGHEST; key++) {
		let e = 0
		for (let w of new Set(OFFSET.map((_, d) => wheel(key, d)))) e += semi[w + 23]
		keys.push({ key, e, own: semi[wheel(key, 2) + 23] })
	}
	let top = Math.max(...keys.map(k => k.e)), best = keys.filter(k => k.e >= 0.999 * top)
	let sounding = best.filter(k => k.own >= 1e-3 * top)
	return (sounding.length ? sounding : best)[0].key
}

// Foldback can route two drawbars of a key to one wheel (the bottom octave's 16' onto the
// 8', the top octaves' upper drawbars onto lower ones): the audio fixes only their sum. The
// canonical split fills the drawbar that is not folded first (up to 8 when the gain is
// known), then the folded one.
function unfold (levels, keys, taps, cap) {
	const folded = (b) => keys.every(k => wheel(k, b) !== k - 23 + OFFSET[b])
	for (let d = 0; d < 9; d++) for (let e = d + 1; e < 9; e++) {
		if (!taps.every(t => t[d] === t[e])) continue
		let [a, b] = folded(d) ? [e, d] : [d, e], sum = levels[a] + levels[b]
		levels[a] = Math.min(sum, cap); levels[b] = sum - levels[a]
	}
	return levels
}

// Scanner setting from the spectral line of each wheel above 300 Hz. The scanner sweeps a
// delay d uniformly over [0, D] at 412/60 Hz, so the vibrato keeps a carrier line of power
// sinc²(πfD) (the mean of e^(−i2πf·d)) and moves the rest to ±6.87 Hz sidebands; chorus adds
// the undelayed half back: carrier ½ + ½·e^(−iπfD)·sinc(πfD) over power ½(1 + sinc(2πfD)).
// A Welch spectrum resolving the sidebands measures each line's share of its band; the
// setting whose prediction matches best wins. Chorus must fit twice as well as vibrato: a
// Leslie on tremolo (6.7 Hz rotor) looks like vibrato, and misread vibrato changes no level.
const sinc = (x) => x ? Math.sin(x) / x : 1
const SETTINGS = [null, 'v1', 'v2', 'v3', 'c1', 'c2', 'c3']
function lineShare (mode, f) {
	if (!mode) return 1
	let D = SCANNER.line * SCANNER.depth[mode], v = sinc(Math.PI * f * D)
	if (mode[0] === 'v') return v * v
	let re = 0.5 + 0.5 * Math.cos(Math.PI * f * D) * v, im = -0.5 * Math.sin(Math.PI * f * D) * v
	return (re * re + im * im) / (0.5 * (1 + sinc(2 * Math.PI * f * D)))
}
function detectScanner (chans, fs, i0, i1, ws) {
	let L = pow2(0.7 * fs)
	if (i1 - i0 < L) return null // too short to resolve 6.87 Hz sidebands: assume none
	let P = welch(chans, i0, i1, L), obs = []
	for (let w of ws) {
		let f = wheelHz(w), band = 0, line = 0
		if (f < 300) continue
		for (let k = Math.ceil(f * 2 ** (-HALF_BAND / 12) * L / fs); k <= Math.min(L / 2, f * 2 ** (HALF_BAND / 12) * L / fs); k++) {
			band += P[k]
			if (Math.abs(k * fs / L - f) <= 3) line += P[k] // Hann main lobe, ±2 bins at 0.7 s
		}
		obs.push({ f, share: line / band, band })
	}
	let top = Math.max(0, ...obs.map(o => o.band))
	obs = obs.filter(o => o.band > 1e-4 * top)
	if (!obs.length) return null
	let cost = SETTINGS.map(m => obs.reduce((s, o) => s + o.band * (o.share - lineShare(m, o.f)) ** 2, 0))
	let best = (from, to) => SETTINGS.slice(from, to).reduce((b, m, i) => cost[from + i] < cost[b] ? from + i : b, from)
	let plain = best(0, 4), chorus = best(4, 7)
	return SETTINGS[cost[chorus] < 0.5 * cost[plain] ? chorus : plain]
}

// Lawson–Hanson active set on the normal equations G x = h, x ≥ 0
function nnls (G, h) {
	let n = h.length, x = new Float64Array(n), P = new Array(n).fill(false)
	const solve = (idx) => {
		let m = idx.length, M = idx.map(i => idx.map(j => G[i][j])), v = idx.map(i => h[i])
		for (let c = 0; c < m; c++) {
			let p = c
			for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
			[M[c], M[p]] = [M[p], M[c]]; [v[c], v[p]] = [v[p], v[c]]
			if (Math.abs(M[c][c]) < 1e-300) continue
			for (let r = c + 1; r < m; r++) { let f = M[r][c] / M[c][c]; for (let k = c; k < m; k++) M[r][k] -= f * M[c][k]; v[r] -= f * v[c] }
		}
		let z = new Array(m).fill(0)
		for (let c = m - 1; c >= 0; c--) { let s = v[c]; for (let k = c + 1; k < m; k++) s -= M[c][k] * z[k]; z[c] = Math.abs(M[c][c]) < 1e-300 ? 0 : s / M[c][c] }
		return z
	}
	let tol = 1e-12 * Math.max(1e-300, ...h.map(Math.abs))
	for (let it = 0; it < 3 * n; it++) {
		let j = -1, best = tol
		for (let i = 0; i < n; i++) if (!P[i]) { let g = h[i]; for (let k = 0; k < n; k++) g -= G[i][k] * x[k]; if (g > best) { best = g; j = i } }
		if (j < 0) break
		P[j] = true
		for (let inner = 0; inner < 3 * n; inner++) {
			let idx = [...P.keys()].filter(i => P[i]), z = solve(idx)
			if (z.every(v => v > 0)) { idx.forEach((i, k) => x[i] = z[k]); break }
			let a = Infinity
			idx.forEach((i, k) => { if (z[k] <= 0) a = Math.min(a, x[i] / (x[i] - z[k])) })
			idx.forEach((i, k) => { x[i] += a * (z[k] - x[i]); if (x[i] <= 0) { x[i] = 0; P[i] = false } })
		}
	}
	return x
}

/**
 * @param {Float32Array|Float64Array|Float32Array[]} data: organ audio, mono or channels
 * @param {object} opts: { fs = 44100, freq: Hz of the key, or Hz[] for a chord (8' pitch;
 *   estimated for a single key when omitted), amp: the render's amp when known (absolute
 *   levels; otherwise the loudest drawbar is 8), vibrato: scanner setting 'v1'..'c3', false
 *   for none, 'auto' (default) to detect it from ≥ 0.7 s of sustained audio }
 * @returns {{ drawbars: string, registration: number[], levels: number[], keys: number[],
 *   percussion: null | { harmonic, decay, volume }, vibrato: null | string, score: number }}
 */
export default function fit (data, { fs = 44100, freq = null, amp = null, vibrato = 'auto' } = {}) {
	let chans = data[0]?.length != null ? data : [data] // stereo (a miked Leslie): powers add, no mid-sum comb
	let [i0, i1] = span(chans, fs)
	let skip = Math.round(SKIP * fs)
	i0 += skip; i1 -= skip
	if (i1 - i0 < 0.1 * fs) throw new RangeError('tonewheel-fit: need at least 0.1 s of sustained audio')
	let keys = freq == null ? [estimateKey(chans, fs, i0, i1)]
		: (Array.isArray(freq) ? freq : [freq]).map(f => Math.round(69 + 12 * Math.log2(f / 440)))

	// wheels that can sound, how many keys tap each through each drawbar, their bands
	let tap = new Map()
	for (let k of keys) for (let d = 0; d < 9; d++) {
		let w = wheel(k, d)
		if (!tap.has(w)) tap.set(w, new Float64Array(9))
		tap.get(w)[d]++
	}
	let ws = [...tap.keys()].sort((a, b) => a - b)
	if (vibrato === 'auto') vibrato = detectScanner(chans, fs, i0, i1, ws)
	else if (vibrato && !SCANNER.depth[vibrato]) throw new RangeError(`tonewheel-fit: vibrato must be v1, v2, v3, c1, c2, c3, false or 'auto', got ${vibrato}`)
	let rows = ws.map((w, i) => {
		let lo = i ? Math.min(HALF_BAND, (w - ws[i - 1]) / 2) : HALF_BAND
		let hi = i < ws.length - 1 ? Math.min(HALF_BAND, (ws[i + 1] - w) / 2) : HALF_BAND
		// frames resolve the band; under chorus they also span two scanner turns, so each
		// frame's band power is the turn-averaged power the interference law describes
		let f = wheelHz(w), half = f * (2 ** (Math.min(lo, hi) / 12) - 1)
		let L = Math.min(pow2(Math.max(2.5 * fs / half, vibrato?.[0] === 'c' ? 2 * fs / SCANNER.hz : 0)), 2 ** Math.floor(Math.log2(i1 - i0)))
		// chorus: dry and scanned halves interfere, power (1 + sinc(2πfD))/2 on average
		let chorus = vibrato?.[0] === 'c' ? Math.sqrt((1 + sinc(2 * Math.PI * f * SCANNER.line * SCANNER.depth[vibrato])) / 2) : 1
		return { w, f, lo: f * 2 ** (-lo / 12), hi: f * 2 ** (hi / 12), L, tap: tap.get(w).map(c => c * chorus), perc: tap.get(w), track: [], t: [] }
	})

	// amplitude tracks: A = 2·√(E / (L·Σw²)) for a sinusoid's band energy E, averaged over channels
	for (let L of new Set(rows.map(r => r.L))) {
		let w = hann(L), norm = 0, buf = new Float64Array(L), mine = rows.filter(r => r.L === L), e = new Float64Array(mine.length)
		for (let i = 0; i < L; i++) norm += w[i] * w[i]
		for (let p = i0, hop = Math.max(Math.round(HOP * fs), L >> 3); p + L <= i1; p += hop) {
			e.fill(0)
			for (let x of chans) {
				for (let i = 0; i < L; i++) buf[i] = x[p + i] * w[i]
				let [re, im] = fft(buf)
				mine.forEach((r, m) => {
					for (let k = Math.ceil(r.lo * L / fs), k1 = Math.min(L / 2, Math.floor(r.hi * L / fs)); k <= k1; k++) e[m] += re[k] * re[k] + im[k] * im[k]
				})
			}
			mine.forEach((r, m) => { r.track.push(2 * Math.sqrt(e[m] / (chans.length * L * norm))); r.t.push((p - i0 + skip) / fs) }) // t: frame start after onset
		}
	}

	// percussion envelope e^(−t/τ) averaged over a frame with the window's power weights
	let weights = new Map()
	const decay = (kind, r, j) => {
		let key = kind + r.L, c = weights.get(key), k = Math.log(1000) / (PERCUSSION.t60[kind] * fs)
		if (c == null) {
			let w = hann(r.L), s = 0, s2 = 0
			for (let i = 0; i < r.L; i++) { s += w[i] * w[i] * Math.exp(-k * i); s2 += w[i] * w[i] }
			weights.set(key, c = s / s2)
		}
		return c * Math.exp(-k * r.t[j] * fs)
	}

	// hypotheses: no percussion, or 2nd/3rd harmonic × fast/slow decay. Effects scale each
	// partial (a room, a cabinet), so errors are relative: reweighted least squares with row
	// weights 1/model², floored at 3% of the loudest wheel, approaches a fit in dB.
	let hyps = [null]
	for (let harmonic of ['second', 'third']) for (let speed of ['fast', 'slow']) hyps.push({ harmonic, decay: speed })
	let fits = hyps.map(h => {
		let cols = h ? 10 : 9, pd = h ? PERCUSSION.drawbar[h.harmonic] : -1, A = [], y = [], ri = []
		rows.forEach((r, i) => r.track.forEach((v, j) => {
			let a = Array.from(r.tap)
			if (h) { a[8] = 0; a.push(r.perc[pd] * decay(h.decay, r, j)) }
			A.push(a); y.push(v); ri.push(i)
		}))
		let x = new Float64Array(cols), wt = new Float64Array(rows.length).fill(1)
		for (let it = 0; it < 4; it++) {
			let G = Array.from({ length: cols }, () => new Float64Array(cols)), b = new Float64Array(cols)
			A.forEach((a, n) => {
				let w = wt[ri[n]]
				for (let p = 0; p < cols; p++) { b[p] += w * a[p] * y[n]; for (let q = 0; q < cols; q++) G[p][q] += w * a[p] * a[q] }
			})
			x = nnls(G, b)
			let m = new Float64Array(rows.length), c = new Float64Array(rows.length)
			A.forEach((a, n) => { let v = 0; for (let p = 0; p < cols; p++) v += a[p] * x[p]; m[ri[n]] += v; c[ri[n]]++ })
			let top = Math.max(...m.map((v, i) => v / c[i]))
			wt = m.map((v, i) => 1 / Math.max(v / c[i], 0.03 * top) ** 2)
		}
		let res = 0, bb = 0
		A.forEach((a, n) => { let v = 0; for (let p = 0; p < cols; p++) v += a[p] * x[p]; res += (y[n] - v) ** 2; bb += y[n] ** 2 })
		return { h, x, res, bb }
	})
	let best = fits.reduce((m, f) => f.res < m.res ? f : m)
	if (best.h && fits[0].res <= best.res * PREFER_NONE) best = fits[0]

	// levels in drawbar-8 units: known gain, or the snap search with the loudest at 8
	let raw = Array.from(best.x.subarray(0, 9)), taps = rows.map(r => r.perc), levels, unit
	if (amp == null) { levels = unfold(raw, keys, taps, Infinity); unit = unitOf(levels) }

	// percussion volume from its peak against the organ: normal cuts the organ, soft the percussion
	let percussion = null, cut = 1
	if (best.h) {
		let peak = PERCUSSION.peak[best.h.decay], ratio = best.x[9] / (amp != null ? amp / 9 : unit)
		let normal = peak / (amp != null ? 1 : PERCUSSION.organCut), soft = peak * PERCUSSION.soft
		let volume = ratio > Math.sqrt(normal * soft) ? 'normal' : 'soft'
		if (volume === 'normal') cut = PERCUSSION.organCut
		percussion = { ...best.h, volume }
	}
	if (amp != null) { unit = amp / 9 * cut; levels = unfold(raw.map(l => l / unit), keys, taps, 1) }
	else levels = levels.map(l => l / unit)
	let registration = levels.map(quantize)

	// score: the share of the note's spectrum inside the wheel bands, times the share of the
	// wheel tracks the quantized registration explains (its gain refit by least squares)
	let L = Math.min(pow2(0.37 * fs), 2 ** Math.floor(Math.log2(i1 - i0)))
	let P = welch(chans, i0, i1, L), total = 0, inband = 0
	for (let k = 1; k < P.length; k++) {
		total += P[k]
		let f = k * fs / L
		if (rows.some(r => f >= r.lo && f <= r.hi)) inband += P[k]
	}
	let q = registration.map(n => TAPS[n] / 64), num = 0, den = 0, err = 0
	let model = (r, j) => {
		let m = 0
		for (let d = 0; d < 9; d++) m += r.tap[d] * q[d]
		if (best.h) m += r.perc[PERCUSSION.drawbar[best.h.harmonic]] * best.x[9] / unit * decay(best.h.decay, r, j)
		return m
	}
	for (let r of rows) for (let j = 0; j < r.track.length; j++) { let m = model(r, j); num += m * r.track[j]; den += m * m }
	let g = den ? num / den : 0
	for (let r of rows) for (let j = 0; j < r.track.length; j++) err += (r.track[j] - g * model(r, j)) ** 2
	let score = (total ? inband / total : 0) * Math.max(0, 1 - err / (best.bb || 1))

	return {
		drawbars: registration.join(''),
		registration,
		levels,
		keys,
		percussion,
		vibrato: vibrato || null,
		score,
	}
}
