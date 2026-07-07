import test, { almost, ok, is } from 'tst'
import pinkNoise from '@audio/synth-noise'
const audio = { pinkNoise }
import { dftMag, magDB, impulse, dc, EPSILON } from './test/util.js'

test('pinkNoise — produces output', () => {
	let data = new Float64Array(256)
	for (let i = 0; i < 256; i++) data[i] = Math.random() * 2 - 1
	audio.pinkNoise(data, {})
	let hasOutput = data.some(x => Math.abs(x) > 0.01)
	ok(hasOutput, 'pink noise has output')
})

test('pinkNoise — spectral slope ~-3dB/octave', () => {
	let N = 65536, fs = 44100
	let data = new Float64Array(N)
	let seed = 12345
	for (let i = 0; i < N; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; data[i] = (seed / 0x7fffffff) * 2 - 1 }
	audio.pinkNoise(data, {})
	let powerLow = 0, powerHigh = 0, countLow = 0, countHigh = 0, binSize = fs / N
	for (let f = 200; f < 400; f += binSize) { let m = dftMag(data, f, fs); powerLow += m * m; countLow++ }
	for (let f = 1600; f < 3200; f += binSize) { let m = dftMag(data, f, fs); powerHigh += m * m; countHigh++ }
	let diffDB = 10 * Math.log10((powerLow / countLow) / (powerHigh / countHigh))
	ok(diffDB > 4 && diffDB < 15, `pink noise slope: ${diffDB.toFixed(1)}dB (expect ~9dB)`)
})


import { noise, chirp, osc } from './index.js'
import { fft } from 'fourier-transform'

// average magnitude spectrum (Welch), then dB slope between two frequencies
function slopeDbPerOct (d, fLo = 500, fHi = 8000, sr = 44100) {
	let N = 4096, half = N / 2
	let acc = new Float64Array(half + 1), frames = 0
	let buf = new Float64Array(N)
	for (let pos = 0; pos + N <= d.length; pos += N / 2) {
		for (let i = 0; i < N; i++) buf[i] = d[pos + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N))
		let [re, im] = fft(buf)
		for (let k = 0; k <= half; k++) acc[k] += re[k] * re[k] + im[k] * im[k]
		frames++
	}
	let bandDb = f => {
		let k0 = Math.round(f * 0.85 * N / sr), k1 = Math.round(f * 1.15 * N / sr), s = 0
		for (let k = k0; k <= k1; k++) s += acc[k]
		return 10 * Math.log10(s / (k1 - k0 + 1) / frames)
	}
	return (bandDb(fHi) - bandDb(fLo)) / Math.log2(fHi / fLo)
}

test('noise colors — spectral slopes ordered and near nominal dB/oct', () => {
	let n = 1 << 17
	let s = {
		brown: slopeDbPerOct(noise(n, { color: 'brown' })),
		pink: slopeDbPerOct(noise(n, { color: 'pink' })),
		white: slopeDbPerOct(noise(n, { color: 'white' })),
		blue: slopeDbPerOct(noise(n, { color: 'blue' })),
		violet: slopeDbPerOct(noise(n, { color: 'violet' })),
	}
	ok(s.brown < s.pink && s.pink < s.white && s.white < s.blue && s.blue < s.violet, 'slope ordering')
	almost(s.white, 0, 1, 'white ~0 dB/oct (' + s.white.toFixed(2) + ')')
	almost(s.pink, -3, 1.5, 'pink ~−3 (' + s.pink.toFixed(2) + ')')
	almost(s.brown, -6, 1.7, 'brown ~−6 (' + s.brown.toFixed(2) + ')')
	almost(s.violet, 6, 1.7, 'violet ~+6 (' + s.violet.toFixed(2) + ')')
	// deterministic
	let a = noise(1024, { color: 'pink', seed: 7 }), b = noise(1024, { color: 'pink', seed: 7 })
	ok(a.every((v, i) => v === b[i]), 'seeded reproducible')
})

function zcFreq (d, from, to, sr = 44100) {
	let c = 0
	for (let i = from + 1; i < to; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) c++
	return c / 2 * sr / (to - from)
}

test('chirp — instantaneous frequency runs f0 → f1; exp midpoint is the geometric mean', () => {
	let d = chirp({ f0: 100, f1: 6400, duration: 2, fs: 44100, method: 'exp' })
	is(d.length, 88200)
	let expAt = t => 100 * Math.pow(64, t / 2) // f(t) = f0·(f1/f0)^(t/T)
	almost(zcFreq(d, 2205, 6615), expAt(0.1), 30, 'start')
	almost(zcFreq(d, 83000, 87000), expAt(85000 / 44100), expAt(85000 / 44100) * 0.08, 'near end')
	almost(zcFreq(d, 42000, 46200), 800, 90, 'exp midpoint ≈ √(f0·f1) = 800')
	let l = chirp({ f0: 100, f1: 6400, duration: 2, fs: 44100, method: 'lin' })
	almost(zcFreq(l, 42000, 46200), 3250, 250, 'lin midpoint ≈ (f0+f1)/2')
})

test('osc — pitch correct; square odd-dominant, saw has 2nd harmonic', () => {
	let s = osc(440, { type: 'sine', duration: 0.5 })
	almost(zcFreq(s, 2205, 19845), 440, 3)
	let goert = (d, f, sr = 44100) => {
		let w = 2 * Math.PI * f / sr, cw = Math.cos(w), s1 = 0, s2 = 0
		for (let i = 0; i < d.length; i++) { let s0 = d[i] + 2 * cw * s1 - s2; s2 = s1; s1 = s0 }
		return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - 2 * cw * s1 * s2)) / d.length
	}
	let sq = osc(440, { type: 'square', duration: 0.5 })
	ok(goert(sq, 1320) > goert(sq, 880) * 3, 'square: 3rd ≫ 2nd')
	let saw = osc(440, { type: 'sawtooth', duration: 0.5 })
	ok(goert(saw, 880) > goert(sq, 880) * 3, 'saw has 2nd harmonic, square does not')
	almost(zcFreq(osc(440, { type: 'sine', duration: 0.5, detune: 100 }), 2205, 19845), 466.16, 4, 'detune +100¢ → A#4')
})

import { dtmf, pluck, risset, rhythm, adsr, lfo, wavetable, membrane, voice } from './index.js'

test('dtmf — digit 5 carries 770 + 1336 Hz, not 697/1209', () => {
	let d = dtmf('5', { fs: 44100 })
	let g = (x, f) => { let w = 2 * Math.PI * f / 44100, cw = Math.cos(w), s1 = 0, s2 = 0; for (let i = 0; i < 3000; i++) { let s0 = x[i] + 2 * cw * s1 - s2; s2 = s1; s1 = s0 } return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - 2 * cw * s1 * s2)) / 3000 }
	ok(g(d, 770) > g(d, 697) * 5 && g(d, 1336) > g(d, 1209) * 5, 'right pair')
})

test('pluck — pitch tracks freq, energy decays', () => {
	let d = pluck(220, { duration: 1 })
	let g = (x, f) => { let w = 2 * Math.PI * f / 44100, cw = Math.cos(w), s1 = 0, s2 = 0; for (let i = 8821; i < 30870; i++) { let s0 = x[i] + 2 * cw * s1 - s2; s2 = s1; s1 = s0 } return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - 2 * cw * s1 * s2)) / 22049 }
	ok(g(d, 220) > g(d, 171) * 5 && g(d, 220) > g(d, 110), 'fundamental at 220 dominant')
	let e = (from, to) => { let s = 0; for (let i = from; i < to; i++) s += d[i] * d[i]; return s }
	ok(e(0, 11025) > e(33075, 44100) * 3, 'decays')
})

test('risset/membrane/rhythm — finite, decaying, grid-timed', () => {
	let r = risset(100)
	ok(r.every(isFinite) && Math.max(...r.slice(0, 8000).map(Math.abs)) > Math.max(...r.slice(-8000).map(Math.abs)) * 2)
	let k = membrane({})
	ok(k.every(isFinite) && Math.abs(k[100]) >= 0)
	let click = rhythm({ bpm: 120, bars: 1, beats: 4 })
	// clicks at 0, 0.5s, 1.0s, 1.5s
	let e = at => { let s = 0, i0 = Math.round(at * 44100); for (let i = i0; i < i0 + 600; i++) s += click[i] * click[i]; return s }
	ok(e(0.5) > e(0.25) * 20, 'beat at 0.5 s, silence at 0.25 s')
})

test('adsr/lfo — shape points', () => {
	let e = adsr({ attack: 0.1, decay: 0.1, sustain: 0.5, duration: 0.5, release: 0.2, fs: 1000 })
	almost(e[50], 0.5, 0.02, 'mid attack')
	almost(e[100], 1, 0.02, 'peak')
	almost(e[300], 0.5, 0.02, 'sustain')
	ok(e[e.length - 1] < 0.05, 'released')
	let l = lfo(2, { duration: 1, fs: 1000, type: 'triangle', unipolar: true })
	ok(Math.min(...l) >= 0 && Math.max(...l) <= 1, 'unipolar bounds')
	almost(l[0], 0, 0.01, 'triangle starts at trough')
	almost(l[125], 0.5, 0.01, 'quarter cycle at mid')
})

test('wavetable — pos 0 plays table A, pos 1 plays table B', () => {
	let N = 512
	let sineT = new Float32Array(N), sqT = new Float32Array(N)
	for (let i = 0; i < N; i++) { sineT[i] = Math.sin(2 * Math.PI * i / N); sqT[i] = i < N / 2 ? 1 : -1 }
	let g = (x, f) => { let w = 2 * Math.PI * f / 44100, cw = Math.cos(w), s1 = 0, s2 = 0; for (let i = 2048; i < x.length - 2048; i++) { let s0 = x[i] + 2 * cw * s1 - s2; s2 = s1; s1 = s0 } return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - 2 * cw * s1 * s2)) / (x.length - 4096) }
	let a = wavetable(440, { tables: [sineT, sqT], position: 0, duration: 0.4 })
	let b = wavetable(440, { tables: [sineT, sqT], position: 1, duration: 0.4 })
	ok(g(b, 1320) > g(a, 1320) * 5, 'square table has 3rd harmonic, sine table does not')
})

test('voice — enveloped, filtered, pitched, finite', () => {
	let v = voice(220, {})
	ok(v.every(isFinite))
	ok(v[v.length - 1] === 0 || Math.abs(v[v.length - 1]) < 0.02, 'released')
	let c = 0
	for (let i = 2206; i < 15435; i++) if ((v[i - 1] < 0) !== (v[i] < 0)) c++
	almost(c / 2 * 44100 / 13229, 220, 12, 'pitch-ish through filter')
})
