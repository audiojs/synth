// Bench for @audio/synth-modal-fit. v1 frozen 2026-10-10 before the fit was tuned against it
// (0254de1, d084e73); v2 (3 below) adds a measurement and held-out strikes, committed before any
// v2 score was computed. Change the fit, not this file. Run from the family root:
//   node packages/synth-modal-fit/bench.js [synthetic [n] | check | floors | recordings | heldout | all]
//
// 1. Synthetic: modes rendered by @audio/synth-modal (impulse, 2 s, amp 0.8), noise added, fit
//    back. Rows: harmonic, free-free bar, circular membrane and free plate ratio tables (Fletcher &
//    Rossing, The Physics of Musical Instruments, 2nd ed., ch. 2–3, as synth-modal cites them),
//    four close pairs split by 1, 2, 5 and 10 Hz (under one bin of a 2048-point frame, 21.5 Hz),
//    24 dense random modes, and the bar struck by a 5 ms noise burst. Gains −30..0 dB with random
//    sign, t60 0.05–10 s log-uniform (close pairs 1–10 s: a split shows only after a beat). Noise:
//    white, its RMS N dB under the first 50 ms of the strike.
//    Metrics per matched mode (each true mode takes the nearest fitted one within 50 cents and
//    0.45 of the gap to its nearest true neighbour): frequency error in cents, t60 relative error,
//    amplitude error in dB, sign; missed true modes and spurious fitted ones, all of them and the
//    audible ones (energy within 60 dB of the strike's); D (below) of the fit's render against the
//    noiseless truth.
// 2. Recordings: strikes cut from free recordings, each fitted and re-rendered, scored by
//    D(a, b) = specLoss(a, b·rms(a)/rms(b)) (@audio/neural-synth: DDSP's multi-scale spectral
//    distance, FFT 2048/512/128) after aligning both at their first sample within 6 dB of the
//    peak, over the shorter length, with one white noise 60 dB under a's RMS added to both.
//    Threshold: a snapshot should sound as close to its strike as the same instrument struck
//    again. A strike's floor is D to its nearest other strike of the instrument (nearest, so a
//    karatala's open ring is held against another open ring, not a muted clap); the instrument's
//    threshold T is the median floor. A strike passes when its re-render scores under its own
//    floor; the instrument passes when its median re-render scores under T.
//    Strikes: 5 ms RMS frames; an onset is a frame within 35 dB of the file's loudest that rises
//    12 dB over the quietest of the 4 frames before it, 100 ms after the last onset (a file that
//    starts loud starts with one). A strike runs from 10 ms before its onset to 10 ms before the
//    next, at most 2 s, at least 100 ms; kept when its peak is within 30 dB of the instrument's
//    loudest strike and it has at most 100 clipped samples (|x| ≥ 0.99); 24 strikes at most.
// 3. v2, approved after v1's results. The flaw of D: every recording sits on a steady background
//    (room, microphone, MP3) some 40 dB under the strike, in bands where the instrument has no
//    mode. Another strike of the same recording carries the same background, a modal snapshot
//    cannot, so T counted the background as matched while every re-render paid for it. D2
//    compares above the reference strike's own background: every cell (frame × bin) of the three
//    spectrograms of specLoss is floored, on both signals, at the larger of the common floor and
//    that strike's background in that bin, so content under the recording's own noise counts for
//    nothing on either side. T and the re-render score are the same D2(a, b), a the reference
//    strike and its background; in T, the other strike's own background counts only where it
//    stands over a's (a different room).
//    Background of a strike, from its onset to its end: Blackman–Harris frames (Harris 1978:
//    sidelobes 92 dB down, so a ringing mode's leakage stays off the bins between modes) of 4096
//    samples (fewer for strikes under 186 ms), hop 1/4; each bin's power averaged over 8 frames
//    and its minimum over the strike taken (minimum statistics, Martin 2001: a mode decays, the
//    background stays); then the lower fifth of those minima over a third octave around the bin
//    (IEC 61260-1 bands; at least ±8 bins), so a mode still ringing at the strike's end is read
//    past, not taken for background. The chain's bias is measured rather than modeled: on white
//    noise of unit variance and the strike's length the chain reads b, and every estimate is
//    divided by b (Martin derives the equivalent correction analytically for his smoother).
//    Floor of a cell: a periodogram cell of stationary noise is exponential in power (chi-square,
//    2 degrees of freedom; Percival & Walden, Spectral Analysis for Physical Applications, 1993,
//    ch. 6), so it stays under 3× its mean in 95% of cells (e^−3 = 0.05). Each cell's magnitude
//    is floored at √(3·P·Σw²): P the background's power per sample averaged over the cell's bin
//    (±fs/N), or the common floor's if larger (white, 60 dB under a's RMS: v1's floor, now a floor
//    rather than an added noise); Σw² = 3N/8 for specLoss's Hann window. Then specLoss's own two
//    terms, unchanged (a copy, checked equal to specLoss without floors: `check`, which also runs
//    the instrument on known inputs: the background estimate against a known noise, and D2 of a
//    modal render without background against the same render with it).
//    Held-out strikes, for validation: strikes the fit was never run on, listed in git before it
//    was: new recordings (HELDOUT) and the mridanga strikes past the 24 the v1 bench takes from its
//    file. Cut and kept by v1's rule per recording session (group), 24 per session at most. A
//    held-out strike's floor is D2 to its nearest other strike of the same session (originals
//    included); a strike alone in its session is reported without a floor. An instrument passes
//    held-out when the median re-render of its held-out strikes scores under the median of their
//    floors; the original strikes' v2 T is shown beside it. Searched and left out: a tingsha
//    rung over a mountain stream (henderda, Freesound 57603; the stream swings 20 dB, 5 ms
//    frames 10th–90th percentile −46 to −27 dB, which the onset rule cuts into strikes and which
//    is no steady background), and a single ring of Indian finger cymbals (misstickle, 212541;
//    the onset rule cuts its beating into four strikes). No clean second tingsha was found.
//
// Data: downloaded to $MODAL_DATA (default ~/.cache/audiojs/data/modal-fit), checked by SHA-256,
// decoded by ffmpeg to mono 44.1 kHz. Nothing is bundled. Freesound files are its 128 kb/s MP3
// previews (originals need a login). specLoss is read from the @audio/neural checkout beside
// @audio/synth (../neural/packages/neural-synth/loss.js).

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { fft, cfft } from 'fourier-transform'
import modal from '@audio/synth-modal'
import fit from './fit.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const specLoss = (await import(path.join(here, '../../../neural/packages/neural-synth/loss.js')).catch(() => {
	throw new Error('bench: specLoss comes from @audio/neural; check it out beside @audio/synth')
})).default
const fs = 44100, DATA = process.env.MODAL_DATA ?? path.join(os.homedir(), '.cache/audiojs/data/modal-fit')
const [part = 'all', count = 10] = process.argv.slice(2)

// --- shared ---

const lcg = (seed) => () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 2 ** 32 // imul: exact mod 2³²
const logu = (rnd, a, b) => a * (b / a) ** rnd()
const gauss = (rnd) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()) // Box–Muller
const quant = (v, q) => { if (!v.length) return NaN; let s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] }
const median = (v) => quant(v, 0.5)
const rms = (x, n = x.length) => { let s = 0; for (let i = 0; i < n; i++) s += x[i] * x[i]; return Math.sqrt(s / n) }
const cpu = (fn) => { let c = process.cpuUsage(), r = fn(), u = process.cpuUsage(c); return [r, (u.user + u.system) / 1e3] }

// amplitude of every mode as synth-modal plays it: amp·gain, gains divided by Σ|gain| past 1
function played ({ freq, amp = 0.8, modes }) {
	let sum = modes.reduce((a, m) => a + Math.abs(m.gain), 0), norm = sum > 1 ? sum : 1
	return modes.map(m => ({ f: freq * m.ratio, A: amp * m.gain / norm, t60: m.t60 }))
}

// D(a, b): both from their first sample within 6 dB of the peak, b at a's RMS, the shorter length,
// one seeded white noise 60 dB under a's RMS added to both: specLoss's log-mel term floors at an
// absolute 1e-7, so without it a difference 70 dB under the strike, which no listener hears next to
// it, could outweigh an audible one
function onset (x) { let p = 0; for (let v of x) p = Math.max(p, Math.abs(v)); let i = 0; while (Math.abs(x[i]) < 0.5 * p) i++; return i }
function D (a, b) {
	a = a.subarray(onset(a)); b = b.subarray(onset(b))
	let n = Math.min(a.length, b.length), r = rms(a, n), g = r / (rms(b, n) || 1), rnd = lcg(1), fa = new Float32Array(n), fb = new Float32Array(n)
	for (let i = 0; i < n; i++) { let e = r * 1e-3 * Math.sqrt(3) * (2 * rnd() - 1); fa[i] = a[i] + e; fb[i] = b[i] * g + e }
	return specLoss(fa, fb, { fs })
}

// --- v2: D2, above the reference strike's own background ---

// specLoss (neural-synth's loss.js: Engel et al. 2020) with every cell of both signals floored at
// fl[N][k], bin k of FFT size N; with no floors it is specLoss (checked by `check`)
const SIZES = [2048, 512, 128], MELS = 48, HANN = new Map(), MEL = new Map()
function hann (N) {
	if (!HANN.has(N)) HANN.set(N, Float64Array.from({ length: N }, (_, i) => 0.5 * (1 - Math.cos(2 * Math.PI * i / N))))
	return HANN.get(N)
}
function mags (x, pos, N, out) {
	let w = hann(N), f = new Float64Array(N)
	for (let i = 0; i < N; i++) f[i] = (x[pos + i] || 0) * w[i]
	let [re, im] = fft(f)
	for (let k = 0; k <= N >> 1; k++) out[k] = Math.hypot(re[k], im[k])
}
function melBank (half) { // HTK mel, 20 Hz to fs/2, rows to unit sum: loss.js's bank
	if (MEL.has(half)) return MEL.get(half)
	let mel = (f) => 2595 * Math.log10(1 + f / 700), imel = (m) => 700 * (10 ** (m / 2595) - 1), lo = mel(20), hi = mel(fs / 2)
	let c = Float64Array.from({ length: MELS + 2 }, (_, i) => imel(lo + (hi - lo) * i / (MELS + 1))), bank = []
	for (let b = 0; b < MELS; b++) {
		let row = new Float64Array(half + 1), sum = 0
		for (let k = 0; k <= half; k++) {
			let f = k * fs / (2 * half)
			row[k] = f <= c[b] || f >= c[b + 2] ? 0 : f <= c[b + 1] ? (f - c[b]) / (c[b + 1] - c[b]) : (c[b + 2] - f) / (c[b + 2] - c[b + 1])
			sum += row[k]
		}
		if (sum > 0) for (let k = 0; k <= half; k++) row[k] /= sum
		bank.push(row)
	}
	MEL.set(half, bank)
	return bank
}
function loss (a, b, fl = null) {
	let n = Math.min(a.length, b.length), total = 0
	for (let N of SIZES) {
		if (N > n) continue
		let hop = N >> 2, half = N >> 1, f = fl?.[N], ma = new Float64Array(half + 1), mb = new Float64Array(half + 1)
		let avgA = new Float64Array(half + 1), avgB = new Float64Array(half + 1), lin = 0, ref = 0, frames = 0
		for (let pos = 0; pos + N <= n; pos += hop) {
			mags(a, pos, N, ma); mags(b, pos, N, mb)
			if (f) for (let k = 0; k <= half; k++) { if (ma[k] < f[k]) ma[k] = f[k]; if (mb[k] < f[k]) mb[k] = f[k] }
			for (let k = 0; k <= half; k++) { let d = ma[k] - mb[k]; lin += d * d; ref += ma[k] * ma[k]; avgA[k] += ma[k]; avgB[k] += mb[k] }
			frames++
		}
		if (!frames) continue
		let mel = 0
		for (let row of melBank(half)) {
			let ea = 0, eb = 0
			for (let k = 0; k <= half; k++) { ea += row[k] * avgA[k]; eb += row[k] * avgB[k] }
			mel += Math.abs(Math.log(ea / frames + 1e-7) - Math.log(eb / frames + 1e-7))
		}
		total += Math.sqrt(lin / (ref + 1e-12)) + mel / MELS
	}
	return total
}

// background power per sample of each bin of a 4096-point grid (white noise of variance σ² reads
// σ²): Blackman–Harris frames, each bin averaged over SMOOTH frames and its minimum over the
// strike taken (Martin 2001), the lower fifth of those over a third octave (at least ±8 bins),
// divided by the same chain's reading of unit white noise of the same length
const BH = [0.35875, 0.48829, 0.14128, 0.01168], SMOOTH = 8, EXCEED = 3, BIAS = new Map()
function chain (x) {
	let F = Math.max(256, Math.min(4096, 2 ** Math.floor(Math.log2(x.length / 2)))), K = F / 2 + 1, frames = []
	let w = Float64Array.from({ length: F }, (_, i) => { let t = 2 * Math.PI * i / F; return BH[0] - BH[1] * Math.cos(t) + BH[2] * Math.cos(2 * t) - BH[3] * Math.cos(3 * t) })
	for (let p = 0; p + F <= x.length; p += F / 4) {
		let re = new Float64Array(F), im = new Float64Array(F)
		for (let i = 0; i < F; i++) re[i] = x[p + i] * w[i]
		cfft(re, im)
		frames.push(Float64Array.from({ length: K }, (_, k) => re[k] * re[k] + im[k] * im[k]))
	}
	let S = Math.min(SMOOTH, frames.length), m = new Float64Array(K).fill(Infinity), P = new Float64Array(K), r = 2 ** (1 / 6)
	for (let t = 0; t + S <= frames.length; t++) for (let k = 0; k < K; k++) {
		let v = 0
		for (let j = t; j < t + S; j++) v += frames[j][k]
		if (v / S < m[k]) m[k] = v / S
	}
	for (let k = 0; k < K; k++) P[k] = quant(m.subarray(Math.max(0, Math.min(k - 8, Math.floor(k / r))), Math.min(K - 1, Math.max(k + 8, Math.ceil(k * r))) + 1), 0.2)
	return { F, P }
}
function background (x) {
	if (!BIAS.has(x.length)) {
		let rnd = lcg(5), z = Float64Array.from({ length: x.length }, () => gauss(rnd))
		BIAS.set(x.length, median(chain(z).P.subarray(1, -1)))
	}
	let { F, P } = chain(x), b = BIAS.get(x.length)
	return { F, P: P.map(v => v / b) }
}

// floor magnitude of every bin of every FFT size: √(EXCEED·P·Σw²), P the background averaged over
// the bin (±fs/N) or the common floor σ2 if larger, Σw² = 3N/8 (Hann)
function cellFloors ({ F, P }, s2) {
	let out = {}
	for (let N of SIZES) {
		let half = N >> 1, r = F / N, f = new Float64Array(half + 1)
		for (let j = 0; j <= half; j++) {
			let lo = Math.max(0, Math.round((j - 1) * r)), hi = Math.min(F / 2, Math.round((j + 1) * r)), s = 0
			for (let k = lo; k <= hi; k++) s += P[k]
			f[j] = Math.sqrt(EXCEED * Math.max(s / (hi - lo + 1), s2) * 3 * N / 8)
		}
		out[N] = f
	}
	return out
}

// D2(A, b): A = { s, bg } the reference strike and its background (from its onset); aligned and
// level-matched as D, the common floor white at 60 dB under a's RMS
const withBg = (s) => ({ s, bg: background(s.subarray(onset(s))) })
function D2 ({ s: a, bg }, b) {
	a = a.subarray(onset(a)); b = b.subarray(onset(b))
	let n = Math.min(a.length, b.length), r = rms(a, n), g = r / (rms(b, n) || 1), fb = new Float64Array(n)
	for (let i = 0; i < n; i++) fb[i] = b[i] * g
	return loss(a.subarray(0, n), fb, cellFloors(bg, (r * 1e-3) ** 2))
}

// the instrument on known inputs: loss ≡ specLoss without floors; the background estimate against
// a known noise under ringing modes; D and D2 of a modal render against itself with a background
function check () {
	let rnd = lcg(11), x = Float64Array.from({ length: 44100 }, () => gauss(rnd)), y = Float64Array.from(x, v => v + 0.3 * gauss(rnd))
	console.log(`loss without floors − specLoss: ${Math.abs(loss(x, y) - specLoss(x, y, { fs })).toExponential(1)} (specLoss ${specLoss(x, y, { fs }).toFixed(6)})`)
	// 40 modes 300 Hz–12 kHz, t60 0.5–5 s, 2 s; noise pink-tilted (white plus a one-pole lowpass), RMS
	// 40 dB under the first 50 ms
	let modes = Array.from({ length: 40 }, () => ({ ratio: logu(rnd, 1, 40), gain: (rnd() < 0.5 ? -1 : 1) * 10 ** (-20 * rnd() / 20), t60: logu(rnd, 0.5, 5) }))
	let clean = modal(300, { modes, duration: 2, fs }), N = clean.length, e = new Float64Array(N), e2 = new Float64Array(N), lp = 0, lp2 = 0
	for (let i = 0; i < N; i++) { let u = gauss(rnd), v = gauss(rnd); lp = 0.95 * lp + u; lp2 = 0.95 * lp2 + v; e[i] = u + 0.3 * lp; e2[i] = v + 0.3 * lp2 }
	let lvl = rms(clean, 2205) * 1e-2 / rms(e), A = Float64Array.from(clean, (v, i) => v + lvl * e[i]), B = Float64Array.from(clean, (v, i) => v + lvl * e2[i])
	let { F, P } = background(A.subarray(onset(A))), nb = background(Float64Array.from(e, v => v * lvl)), err = []
	for (let fc = 250; fc < 16000; fc *= 2 ** (1 / 3)) {
		let lo = Math.round(fc * 2 ** (-1 / 6) * F / fs), hi = Math.round(fc * 2 ** (1 / 6) * F / fs), p = 0, q = 0
		for (let k = lo; k <= hi; k++) { p += P[k]; q += nb.P[k] }
		err.push(10 * Math.log10(p / q))
	}
	console.log(`background under 40 ringing modes against the noise alone, third octaves 250 Hz–16 kHz: median ${median(err).toFixed(2)} dB, range ${Math.min(...err).toFixed(2)} to ${Math.max(...err).toFixed(2)} dB`)
	let a = withBg(A)
	console.log(`render with background a, the same render b without, with another background c:  D(a,b) ${D(A, clean).toFixed(3)}  D(a,c) ${D(A, B).toFixed(3)}  |  D2(a,b) ${D2(a, clean).toFixed(3)}  D2(a,c) ${D2(a, B).toFixed(3)}`)
}

// --- 1. synthetic ---

const BAR = [4.7300, 7.8532, 10.9956, 14.1372] // free-free bar λk; λk → (2k+1)π/2 past 4 (F&R ch. 2)
const TABLES = {
	harmonic: Array.from({ length: 8 }, (_, i) => i + 1),
	bar: Array.from({ length: 6 }, (_, i) => ((i < 4 ? BAR[i] : (2 * i + 3) * Math.PI / 2) / BAR[0]) ** 2),
	membrane: [1, 1.5933, 2.1355, 2.2954, 2.6531, 2.9173, 3.1555, 3.5001], // F&R Table 3.2
	plate: [1, 1.73, 2.328, 3.91, 4.11], // F&R free circular plate, as synth-modal
}
const randMode = (rnd, ratio, t60 = [0.05, 10]) => ({ ratio, gain: (rnd() < 0.5 ? -1 : 1) * 10 ** (-30 * rnd() / 20), t60: logu(rnd, ...t60) })
const ROWS = {
	'harmonic 8': (rnd) => ({ freq: logu(rnd, 80, 1000), modes: TABLES.harmonic.map(r => randMode(rnd, r)) }),
	'bar 6': (rnd) => ({ freq: logu(rnd, 80, 1000), modes: TABLES.bar.map(r => randMode(rnd, r)) }),
	'membrane 8': (rnd) => ({ freq: logu(rnd, 80, 1000), modes: TABLES.membrane.map(r => randMode(rnd, r)) }),
	'plate 5': (rnd) => ({ freq: logu(rnd, 80, 2000), modes: TABLES.plate.map(r => randMode(rnd, r)) }),
	'close pairs 1/2/5/10 Hz': (rnd) => {
		let c = []
		while (c.length < 4) { let f = logu(rnd, 200, 8000); if (c.every(g => Math.abs(g - f) > 300)) c.push(f) }
		let f0 = Math.min(...c), modes = []
		c.forEach((f, i) => {
			let m = randMode(rnd, f / f0, [1, 10])
			modes.push({ ...m, gain: Math.sign(m.gain) * 10 ** (-12 * rnd() / 20) }, { ...randMode(rnd, (f + [1, 2, 5, 10][i]) / f0, [1, 10]), gain: (rnd() < 0.5 ? -1 : 1) * 10 ** (-12 * rnd() / 20) })
		})
		return { freq: f0, modes }
	},
	'dense 24': (rnd) => {
		let f = []
		while (f.length < 24) { let v = logu(rnd, 200, 12000); if (f.every(g => Math.abs(g - v) >= 10)) f.push(v) }
		let f0 = Math.min(...f)
		return { freq: f0, modes: f.map(v => randMode(rnd, v / f0)) }
	},
	'bar 6, 5 ms noise burst': (rnd) => {
		let exciter = new Float32Array(Math.round(0.005 * fs)).map(() => 2 * rnd() - 1)
		return { freq: logu(rnd, 80, 1000), modes: TABLES.bar.map(r => randMode(rnd, r)), exciter }
	},
}
const SNRS = [Infinity, 60, 40, 20]

// the true amplitude of each mode: through a burst exciter e, mode k rings at |Σ e[m] z^(−m)| times
// its impulse response (z its pole), its sign then lost
function truth (spec) {
	let m = played(spec)
	if (!spec.exciter) return m
	return m.map(({ f, A, t60 }) => {
		let w = 2 * Math.PI * f / fs, r = Math.exp(-Math.log(1000) / (t60 * fs)), re = 0, im = 0
		spec.exciter.forEach((e, n) => { re += e * r ** -n * Math.cos(w * n); im -= e * r ** -n * Math.sin(w * n) }) // e·z^(−n), z^(−n) = r^(−n)e^(−iwn)
		return { f, A: Math.abs(A) * Math.hypot(re, im), t60, unsigned: true }
	})
}

function match (tru, got) {
	let used = new Set(), pairs = [], cents = (a, b) => 1200 * Math.log2(a / b)
	let order = tru.map((_, i) => i).sort((i, j) => Math.abs(tru[j].A) - Math.abs(tru[i].A))
	for (let i of order) {
		let gap = Math.min(...tru.filter((_, j) => j !== i).map(t => Math.abs(cents(t.f, tru[i].f))), Infinity)
		let tol = Math.min(50, 0.45 * gap), best = -1
		got.forEach((g, j) => { if (!used.has(j) && Math.abs(cents(g.f, tru[i].f)) <= tol && (best < 0 || Math.abs(cents(g.f, tru[i].f)) < Math.abs(cents(got[best].f, tru[i].f)))) best = j })
		if (best >= 0) { used.add(best); pairs.push([tru[i], got[best]]) }
	}
	return { pairs, missed: tru.length - pairs.length, spurious: got.filter((_, j) => !used.has(j)) }
}

function synthetic (n) {
	console.log(`Synthetic: ${n} renders per row, 2 s at 44.1 kHz. |error| median / 95th percentile; sign: correct share of matched modes`)
	console.log('row                          noise  | cents            | t60 %            | amp dB           | sign  | missed: audible, all | spurious: audible, all | D      | cpu ms')
	let rows = []
	Object.entries(ROWS).forEach(([name, make], r) => SNRS.forEach((snr, si) => {
		let rnd = lcg(1000 * r + 7), noise = lcg(1000 * r + 10 * si + 11), cents = [], t60 = [], amp = [], sign = [], loss = [], ms = []
		let missed = 0, total = 0, spur = 0, missedA = 0, totalA = 0, spurA = 0
		for (let k = 0; k < n; k++) {
			let spec = make(rnd), clean = modal(spec.freq, { modes: spec.modes, exciter: spec.exciter ?? 'impulse', duration: 2, fs, amp: 0.8 })
			let x = Float64Array.from(clean)
			if (snr < Infinity) {
				let s = rms(clean, Math.round(0.05 * fs)) * 10 ** (-snr / 20)
				for (let i = 0; i < x.length; i++) x[i] += s * Math.sqrt(-2 * Math.log(1 - noise())) * Math.cos(2 * Math.PI * noise()) // Box–Muller
			}
			let [res, t] = cpu(() => { try { return fit(x, { fs }) } catch (e) { return null } })
			ms.push(t)
			let tru = truth(spec), got = res ? played(res) : [], E = rms(clean) ** 2 * clean.length
			const audible = (m) => m.A * m.A / 2 * (1 - Math.exp(-2 * Math.log(1000) / (m.t60 * fs) * clean.length)) / (1 - Math.exp(-2 * Math.log(1000) / (m.t60 * fs))) >= 1e-6 * E
			let m = match(tru, got)
			for (let [a, b] of m.pairs) {
				cents.push(Math.abs(1200 * Math.log2(b.f / a.f))); t60.push(100 * Math.abs(b.t60 / a.t60 - 1))
				amp.push(Math.abs(20 * Math.log10(Math.abs(b.A) / Math.abs(a.A))))
				if (!a.unsigned) sign.push(Math.sign(a.A) === Math.sign(b.A))
			}
			missed += m.missed; total += tru.length; spur += m.spurious.length
			let hit = new Set(m.pairs.map(([a]) => a))
			totalA += tru.filter(audible).length; missedA += tru.filter(t => audible(t) && !hit.has(t)).length; spurA += m.spurious.filter(audible).length
			loss.push(res ? D(clean, modal(res.freq, { ...res, duration: 2, fs })) : NaN)
		}
		let q = (v, d = 2) => `${median(v).toFixed(d).padStart(7)} / ${quant(v, 0.95).toFixed(d).padStart(7)}`
		let row = { name, snr, cents: [median(cents), quant(cents, 0.95)], t60: [median(t60), quant(t60, 0.95)], amp: [median(amp), quant(amp, 0.95)], sign: sign.length ? sign.filter(Boolean).length / sign.length : null, missed, total, missedA, totalA, spur, spurA, loss: median(loss), ms: median(ms) }
		rows.push(row)
		console.log(`${name.padEnd(28)} ${(snr === Infinity ? 'none' : `−${snr} dB`).padStart(6)} | ${q(cents, 3)} | ${q(t60)} | ${q(amp)} | ${sign.length ? `${Math.round(100 * row.sign)}%`.padStart(5) : '    –'} | ${`${missedA}/${totalA}`.padStart(9)} ${`${missed}/${total}`.padStart(10)} | ${String(spurA).padStart(11)} ${String(spur).padStart(10)} | ${median(loss).toFixed(3).padStart(6)} | ${median(ms).toFixed(0).padStart(6)}`)
	}))
	return rows
}

// --- 2. recordings ---

const FS = (id, user, title, author, license) => ({ url: `https://cdn.freesound.org/previews/${String(id).slice(0, -3) || 0}/${id}_${user}-hq.mp3`, page: `https://freesound.org/s/${id}/`, title, author, license })
const SOURCES = [
	{ instrument: 'karatala', file: 'karatala-01.mp3', sha256: '4bb2a60ba4894bb367edf5202ed1dde58190a7d6ffb764e77259bd32ce499250', ...FS(128676, 2010064, 'YNDkaratalas01.aiff', 'yasodanandana', 'CC BY 3.0') },
	{ instrument: 'karatala', file: 'karatala-02.mp3', sha256: '2e5b6178b8556f9d43cc31fde8a91fe9e98e94bc080f3bd304735e9dc3e90217', ...FS(128675, 2010064, 'YNDkaratalas02.aiff', 'yasodanandana', 'CC BY 3.0') },
	{ instrument: 'finger cymbals', file: 'finger-cymbals.mp3', sha256: 'e9567a9e72a44dfcf7cd91801c113cf5344bf5d61e16ac6cb63a4bcefca6bae8', ...FS(439616, 737466, 'Finger cymbals.WAV', 'Luc Henrion', 'CC0 1.0') },
	{ instrument: 'tingsha', file: 'tingsha.mp3', sha256: 'c21f4d8a2031203ac8ac9b380fe68558093d7e752f463ff04ab2d97936002ab6', ...FS(435074, 1844073, 'Tingsha Cymbal', 'steffcaffrey', 'CC0 1.0') },
	{ instrument: 'bell', file: 'bell-15cm.ogg', sha256: '0a6dbc25677ed02c36024945386c9006172bb870572ec54f25a3197989056163', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Striking_a_bell_15cm_large.ogg', page: 'https://commons.wikimedia.org/wiki/File:Striking_a_bell_15cm_large.ogg', title: 'Striking a bell 15cm large', author: 'stephan', license: 'public domain' },
	{ instrument: 'ghanta', file: 'ghanta.mp3', sha256: '8f3566c435cbcaf41c2e06411ecd2c89084678767e0405294af2cfde9efc7b45', ...FS(274316, 3597112, 'Ghanta-Leather-Mallet-2015-05-16', 'the_very_Real_Horst', 'CC0 1.0') },
	...[[345575, 'f6001ef4b477ddee8a708fd51568acb39237e813819a674fe94d5afd8a38f21a'], [345574, 'ee389bf11d6502172104f3f9f1720bfea804e6c4d5e64dd284e951c192c7a544'],
		[345573, 'd507d76c4486a9be77712c78955548b2329607c21e89b950d910111385fce6d5'], [345580, 'a541d5aa86e8dc9a8aaff0a8d341851da809d6b9c411c9701750b2d0aaf5f7a8'],
		[345579, '651e6e6f5f812012c894eaca3d361415dec34a98139dd47ba6da197a26d04ba2'], [345578, 'a885c36ee959db403983b30851c36acadda0f1f65a0e0a166300886236432332'],
		[345577, '8429b2ff6096f97bf907f3de5cb8c879cb8f086e90432ae2cb0bc6a8128e4efd'], [345582, '5edcb47b55d076f25628257162158cd2194d08c2d69120d7926ca511207cc941'],
		[345581, '19b0a0f7d5affcc1b52a8700a9c042169524c9b978f9f8f6dde5f306af19ceb9'], [420858, '0529c4f99ab13c28eee6ab5f7ae719ffba03918acfc1df4b35907ee03c55c0ec'],
	].map(([id, sha256], i) => ({ instrument: 'tabla', file: `tabla-da-${String(i + 2).padStart(2, '0')}.mp3`, sha256, ...FS(id, 6240954, `Da_Test${String(i + 2).padStart(2, '0')}.wav`, 'subodh3012', 'CC0 1.0') })),
	{ instrument: 'mridanga', file: 'mridangam-tishra.mp3', sha256: 'c091b5f673cfb67b979a71db45c6ebfc5e5cf5c80d0d96611dbdc0fd4a57a835', ...FS(176272, 2385996, 'Mridangam-Tishra', 'ajaysm', 'CC0 1.0') },
]

async function load (src) {
	let file = path.join(DATA, src.file)
	if (!existsSync(file)) {
		mkdirSync(DATA, { recursive: true })
		let res = await fetch(src.url, { headers: { 'user-agent': 'audiojs-bench/1.0 (+https://github.com/audiojs/synth)' } })
		if (!res.ok) throw new Error(`bench: ${src.url}: ${res.status}`)
		writeFileSync(file, Buffer.from(await res.arrayBuffer()))
	}
	let sha = createHash('sha256').update(readFileSync(file)).digest('hex')
	if (sha !== src.sha256) throw new Error(`bench: ${src.file} changed (sha256 ${sha}); the bench is frozen on ${src.sha256}`)
	let pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(fs), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
	return new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length >> 2)
}

function cut (x) {
	let h = Math.round(0.005 * fs), n = Math.floor(x.length / h), db = new Float64Array(n)
	for (let i = 0; i < n; i++) db[i] = 20 * Math.log10(rms(x.subarray(i * h, i * h + h), h) + 1e-12)
	let top = Math.max(...db), on = db.slice(0, 3).some(v => v >= top - 30) ? [0] : []
	for (let i = 4; i < n; i++) if (db[i] >= top - 35 && db[i] - Math.min(...db.slice(i - 4, i)) > 12 && (!on.length || i - on[on.length - 1] >= 20)) on.push(i)
	return on.map((i, k) => {
		let a = Math.max(0, (i - 2) * h), b = Math.min(k + 1 < on.length ? (on[k + 1] - 2) * h : x.length, a + 2 * fs)
		return x.subarray(a, b)
	}).filter(s => s.length >= 0.1 * fs)
}

// held-out recordings: never fitted before this list was committed. group: the recording session
// a strike's floor is read within (originals: one session per instrument; Da_Test01 joins the
// tabla's). Commons files: the uploaded originals.
const WM = (file, title, author, license) => ({ url: `https://upload.wikimedia.org/wikipedia/commons/${file}`, page: `https://commons.wikimedia.org/wiki/File:${file.split('/').pop()}`, title, author, license })
const HELDOUT = [
	{ instrument: 'karatala', group: 'hand cymbals, Japan', file: 'hand-cymbals-japan.mp3', sha256: '3b7bd267a976fe85c13db08f3bdaf4a5e44c88eb7a71930789e85c16e3a64ec6', ...FS(365414, 179538, 'Japan_Asian_Hand_Cymbals_Improv.wav', 'RutgerMuller', 'CC0 1.0') },
	{ instrument: 'karatala', group: 'zill 7 cm, Nepal', file: 'zill-small-1.mp3', sha256: '6f602e4b28788c5cb43f49b596c6a897ceb2fb4567a7094967d4a6e107267146', ...WM('6/63/Audio_Zill_small_1.mp3', 'Audio Zill small 1', 'Hadi', 'CC0 1.0') },
	{ instrument: 'karatala', group: 'zill 7 cm, Nepal', file: 'zill-small-2.mp3', sha256: '5ba8f0158a9bf62b9d6f95c98f9ca567e0a1ba0ab005067de25436cbdc3967e7', ...WM('4/45/Audio_Zill_small_2.mp3', 'Audio Zill small 2', 'Hadi', 'CC0 1.0') },
	{ instrument: 'karatala', group: 'manjira', file: 'manjeera.mp3', sha256: 'c64f2dceccf9f009e07c446850a232264565f1e7b333e8ca660d5a83d0fa11c8', ...FS(418152, 4844309, 'ornamental manjeera.wav', 'johnnyguitar01', 'CC0 1.0') },
	{ instrument: 'finger cymbals', group: 'Zildjian finger cymbals', file: 'finger-cymbals-zildjian.mp3', sha256: 'a5462ed095dead9556136cf2fa64161329378e026288e0c7653c842d04f8e09a', ...FS(626655, 8765604, 'finger cymbals', 'peter_fedak', 'CC BY 4.0') },
	{ instrument: 'finger cymbals', group: 'finger cymbal, thatjeffcarter', file: 'finger-cymbal-carter.mp3', sha256: 'cbafaffde06345a327a453fce9adaad0f727c31283e4a6f8293ef48cbee448f9', ...FS(146070, 1306869, 'finger cymbal.wav', 'thatjeffcarter', 'CC BY 4.0') },
	{ instrument: 'finger cymbals', group: 'Sabian finger cymbals', file: 'finger-cymbals-sabian.ogg', sha256: 'f2a02068cd1ec632301d4dc078661c1d58b1c62ae109a9179bad4e6e942bc3d7', ...WM('7/7c/Finger_cymbals.ogg', 'Finger cymbals', 'Why? I Ask', 'CC BY-SA 4.0') },
	{ instrument: 'bell', group: 'rin', file: 'rin.ogg', sha256: '41b049a3f5a41dc3e1b81448d1331b82a1c97a62ea2086065d2e9712ae000634', ...WM('e/e6/Japanese_rin_played_as_struck_idiophone.ogg', 'Japanese rin played as struck idiophone', 'MichaelMaggs', 'CC BY-SA 4.0') },
	{ instrument: 'bell', group: 'miniature bell', file: 'bell-miniature.wav', sha256: '9e4593bd96a9d1fa90abf48516101ed6ec41d62d566af7374b02f219fc275194', ...WM('1/11/Sonido_de_campana_miniatura_1.wav', 'Sonido de campana miniatura 1', 'Luis Alvaz', 'CC BY-SA 4.0') },
	{ instrument: 'ghanta', group: 'drilbu', file: 'drilbu.mp3', sha256: 'a64ab92a8d34ec1d822a248aec2089df1bf649a28ba0d93873cc8e803e17a164', ...FS(516574, 11350634, '01drilbu', 'tenzin64', 'CC0 1.0') },
	{ instrument: 'tabla', group: 'tabla', file: 'tabla-da-01.mp3', sha256: 'e039acc4aba016a730e4ec7c59520a495f606669996fbc67b4d8ebf1e12fb5ca', ...FS(345576, 6240954, 'Da_Test01.wav', 'subodh3012', 'CC0 1.0') },
	{ instrument: 'mridanga', group: 'Mridangam-Khanda', file: 'mridangam-khanda.mp3', sha256: '1247630953cc161d81dfeb9236ad748af8e699b8dca4cb99d08843d838131c87', ...FS(176276, 2385996, 'Mridangam-Khanda', 'ajaysm', 'CC0 1.0') },
]
const group = (src) => src.group ?? src.instrument

// strikes of the sources by key (v1: instrument), kept by v1's rule: the first 24 in `kept`, the
// rest that pass in `rest`
async function strikes (sources = SOURCES, key = (src) => src.instrument) {
	let by = new Map()
	for (let src of sources) {
		let x = await load(src)
		if (!by.has(key(src))) by.set(key(src), [])
		by.get(key(src)).push(...cut(x).map(s => ({ s, src })))
	}
	for (let [name, list] of by) {
		let peak = (s) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0), top = Math.max(...list.map(({ s }) => peak(s)))
		let ok = list.filter(({ s }) => peak(s) >= top * 10 ** (-30 / 20) && s.filter(v => Math.abs(v) >= 0.99).length <= 100)
		by.set(name, { kept: ok.slice(0, 24), rest: ok.slice(24) })
	}
	return by
}

// each strike's floor: D (or D2) to its nearest other strike among `others` (default: the list)
const nearest = (a, others, d) => Math.min(...others.filter(b => b !== a).map(b => d(a, b.s)), Infinity)
const floors = (list, d, others = list) => list.map(a => nearest(a, others, d))
const v1 = (a, b) => D(a.s, b), v2 = (a, b) => D2(a, b)

// a fit's re-render of each strike; null when the fit throws
function refit (list) {
	for (let a of list) {
		let [r, t] = cpu(() => { try { return fit(a.s, { fs }) } catch (e) { return null } })
		Object.assign(a, { r, ms: t, y: r && modal(r.freq, { ...r, fs, duration: a.s.length / fs }) })
	}
}
const fmt = (v, d = 3) => Number.isFinite(v) ? v.toFixed(d) : '–'
const range = (v) => v.length ? `${fmt(Math.min(...v))}–${fmt(Math.max(...v))}` : ''

// one table row: floors fl, re-render scores R; a strike passes under its own floor
function verdict (fl, R) {
	let has = fl.map(Number.isFinite), T = median(fl.filter((_, i) => has[i])), Rm = median(R.filter((_, i) => has[i]))
	return { T, Rm, Rall: median(R), pass: R.filter((v, i) => has[i] && v < fl[i]).length, n: has.filter(Boolean).length, ok: Number.isFinite(T) && !Number.isNaN(Rm) ? Rm < T : null }
}
const cell = ({ T, Rall, pass, n, ok }, fl, R) => `${fmt(T).padStart(6)} ${range(fl.filter(Number.isFinite)).padStart(12)} | ${fmt(Rall).padStart(6)} ${range(R).padStart(12)} ${(n ? `${pass}/${n}` : '–').padStart(5)} ${ok == null ? '   –' : ok ? 'pass' : 'FAIL'}`

async function recordings (scoreFit) {
	let by = await strikes()
	console.log(`Recordings, original strikes: floor = distance to the nearest other strike, T = median floor${scoreFit ? '; R = distance to the re-render (median, range), strikes under their own floor, verdict' : ''}`)
	console.log(`instrument      strikes | v1: T     floor range | R      R range      pass  verdict | v2: T     floor range | R      R range      pass  verdict ${scoreFit ? '| modes | cpu ms' : ''}`)
	let out = []
	for (let [name, { kept: list }] of by) {
		list = list.map(({ s, src }) => ({ ...withBg(s), src }))
		// one strike has no floor: its re-render is reported without a verdict
		let f1 = list.length > 1 ? floors(list, v1) : list.map(() => NaN), f2 = list.length > 1 ? floors(list, v2) : list.map(() => NaN), row = { name, strikes: list.length, f1, f2 }
		if (scoreFit) refit(list)
		let R1 = list.map(a => !scoreFit ? NaN : a.y ? D(a.s, a.y) : Infinity), R2 = list.map(a => !scoreFit ? NaN : a.y ? D2(a, a.y) : Infinity)
		let e1 = verdict(f1, R1), e2 = verdict(f2, R2)
		Object.assign(row, { R1, R2, e1, e2, modes: median(list.map(a => a.r?.modes.length ?? 0)), ms: median(list.map(a => a.ms)) })
		console.log(`${name.padEnd(15)} ${String(list.length).padStart(7)} | ${cell(e1, f1, scoreFit ? R1 : [])} | ${cell(e2, f2, scoreFit ? R2 : [])} ${scoreFit ? `| ${String(row.modes).padStart(5)} | ${fmt(row.ms, 0).padStart(6)}` : ''}`)
		out.push(row)
	}
	console.log('\nSources:')
	for (let s of SOURCES) console.log(`  ${s.instrument}: "${s.title}" by ${s.author}, ${s.license}, ${s.page}`)
	return out
}

// held-out: new recordings by session, and the strikes past the 24 v1 takes from its files, each
// floored against its own session (originals included)
async function heldout () {
	let orig = await strikes(), held = await strikes(HELDOUT, group), sessions = new Map()
	const add = (g, list, key) => { if (!sessions.has(g)) sessions.set(g, { orig: [], held: [] }); sessions.get(g)[key].push(...list.map(({ s, src }) => ({ ...withBg(s), src }))) }
	for (let { kept, rest } of orig.values()) {
		for (let [g, k] of [[kept, 'orig'], [rest.slice(0, 24), 'held']]) for (let a of g) add(group(a.src), [a], k)
	}
	for (let [g, { kept }] of held) add(g, kept, 'held')
	console.log('Held-out strikes: floor = distance to the nearest other strike of the session (originals included); T = median floor of the held-out strikes; R = distance to the re-render')
	console.log(`instrument      session                        strikes | v1: T     floor range | R      R range      pass  verdict | v2: T     floor range | R      R range      pass  verdict | v2 T of originals`)
	let by = new Map(), out = []
	for (let [g, { orig: o, held: h }] of sessions) {
		if (!h.length) continue
		let name = h[0].src.instrument, all = [...o, ...h]
		let f1 = floors(h, v1, all), f2 = floors(h, v2, all)
		refit(h)
		let R1 = h.map(a => a.y ? D(a.s, a.y) : Infinity), R2 = h.map(a => a.y ? D2(a, a.y) : Infinity), e1 = verdict(f1, R1), e2 = verdict(f2, R2)
		let To = o.length > 1 ? median(floors(o, v2)) : NaN
		console.log(`${name.padEnd(15)} ${g.padEnd(30)} ${String(h.length).padStart(7)} | ${cell(e1, f1, R1)} | ${cell(e2, f2, R2)} | ${fmt(To)}`)
		if (!by.has(name)) by.set(name, { f1: [], f2: [], R1: [], R2: [] })
		let b = by.get(name)
		b.f1.push(...f1); b.f2.push(...f2); b.R1.push(...R1); b.R2.push(...R2)
		out.push({ name, group: g, strikes: h.length, f1, f2, R1, R2, e1, e2, To })
	}
	console.log('\nBy instrument, held-out strikes with a floor pooled:')
	for (let [name, b] of by) console.log(`${name.padEnd(15)} ${String(b.f2.filter(Number.isFinite).length).padStart(7)} | ${cell(verdict(b.f1, b.R1), b.f1, b.R1)} | ${cell(verdict(b.f2, b.R2), b.f2, b.R2)}`)
	console.log('\nHeld-out sources:')
	for (let s of HELDOUT) console.log(`  ${s.instrument} (${group(s)}): "${s.title}" by ${s.author}, ${s.license}, ${s.page}`)
	console.log('  mridanga: Mridangam-Tishra strikes 25 on (the v1 bench takes the first 24)')
	return out
}

if (part === 'check') check()
if (part === 'synthetic' || part === 'all') synthetic(Number(count))
if (part === 'floors') await recordings(false)
if (part === 'recordings' || part === 'all') await recordings(true)
if (part === 'heldout' || part === 'all') await heldout()
