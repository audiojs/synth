import test, { almost, ok, is } from 'tst'
import { pinkNoise } from '@audio/synth-noise'
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


import { noise, white, chirp, osc } from './index.js'
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
	let n = (1 << 17) / 44100  // seconds — colors API is (duration, opts)
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
	let a = noise(1024 / 8000, { color: 'pink', seed: 7, fs: 8000 }), b = noise(1024 / 8000, { color: 'pink', seed: 7, fs: 8000 })
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
	let k = membrane()
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

import poly from '@audio/synth-poly'
import sfx from '@audio/synth-sfx'

function goertzel (d, f, fs = 44100, from = 0, to = d.length) {
	let w = 2 * Math.PI * f / fs, cw = Math.cos(w), s1 = 0, s2 = 0
	for (let i = from; i < to; i++) { let s0 = d[i] + 2 * cw * s1 - s2; s2 = s1; s1 = s0 }
	return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - 2 * cw * s1 * s2)) / (to - from)
}

test('poly — chord mixes voices at their notes, honors timing', () => {
	let out = poly([
		{ time: 0, midi: 60, duration: 0.5 },
		{ time: 0, midi: 64, duration: 0.5 },
		{ time: 0.6, midi: 67, duration: 0.3 },
	], { voice: (f, { fs, duration }) => osc(f, { duration, fs, amp: 0.3 }), fs: 44100 })
	let C = goertzel(out, 261.63, 44100, 0, 22050), E = goertzel(out, 329.63, 44100, 0, 22050)
	let Glate = goertzel(out, 392, 44100, 26460, 39690)
	let Gearly = goertzel(out, 392, 44100, 0, 22050)
	ok(C > 0.05 && E > 0.05, 'chord tones present')
	ok(Glate > Gearly * 5, 'third note enters on schedule')
	ok(out.every(isFinite))
})

test('poly — voice stealing caps simultaneity without clicks', () => {
	let notes = []
	for (let i = 0; i < 8; i++) notes.push({ time: i * 0.01, midi: 60 + i, duration: 1 })
	let out = poly(notes, { voices: 2, voice: (f, { fs, duration }) => osc(f, { duration, fs, amp: 0.5 }), fs: 44100 })
	let peak = 0
	for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]))
	ok(peak < 0.5 * 3, `≤2 voices sound at once (peak ${peak.toFixed(2)})`)
	let maxJump = 0
	for (let i = 1; i < out.length; i++) maxJump = Math.max(maxJump, Math.abs(out[i] - out[i - 1]))
	ok(maxJump < 0.25, `steal fades, no clicks (jump ${maxJump.toFixed(3)})`)
})

test('poly — requires a voice', () => {
	let threw = false
	try { poly([{ midi: 60 }], {}) } catch { threw = true }
	ok(threw)
})

test('sfx — presets render, deterministic, finite', () => {
	for (let name of ['pickup', 'laser', 'explosion', 'powerup', 'hit', 'jump', 'blip', 'coin']) {
		let a = sfx(name), b = sfx(name)
		ok(a.length > 1000, name + ' has body')
		ok(a.every(isFinite), name + ' finite')
		let same = true
		for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break }
		ok(same, name + ' deterministic')
	}
})

test('sfx — laser slides down, pickup arpeggiates up', () => {
	let l = sfx('laser', { fs: 44100 })
	// zero-crossing rate early vs late — downward slide
	let zc = (d, a, b) => { let c = 0; for (let i = a + 1; i < b; i++) if ((d[i-1] < 0) !== (d[i] < 0)) c++; return c / (b - a) }
	ok(zc(l, 0, 2000) > zc(l, l.length - 3000, l.length - 1000) * 1.3, 'laser pitch falls')
	let p = sfx('pickup', { fs: 44100 })
	ok(zc(p, p.length - 4000, p.length - 2000) > zc(p, 0, 2000) * 1.2, 'pickup steps up')
})

test('sfx — unknown preset throws, object preset works', () => {
	let threw = false
	try { sfx('nosuch') } catch { threw = true }
	ok(threw)
	let o = sfx({ freq: 440, shape: 'sine', attack: 0.01, sustain: 0.1, release: 0.1 })
	almost(goertzel(o, 440, 44100, 500, 4000) > 0.1, true)
})

test('chirp — degenerate sweep (f0 === f1) is a constant tone, not NaN', () => {
	let d = chirp({ f0: 20000, f1: 20000, duration: 0.2, fs: 44100 })
	ok([...d].every(Number.isFinite), 'finite')
	// constant frequency: zero-crossing rate ≈ f0
	let zc = 0
	for (let i = 1; i < d.length; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zc++
	let hz = zc / 2 / 0.2
	ok(Math.abs(hz - 20000) < 250, `constant tone at f0 (${hz.toFixed(0)}Hz)`)
})

import { fm, bell, epiano, modal } from './index.js'

test('fm — Bessel sideband amplitudes match Chowning 1973 phase-modulation theory (Abramowitz & Stegun J_k(2))', () => {
	let fs = 48000, N = 32768
	let freq = 2048 * fs / N   // exact bin 2048 -> 3000 Hz carrier
	let ratio = 256 / 2048     // exact bin 256 -> 375 Hz modulator
	let d = fm(freq, { ratio, index: 2.0, indexDecay: 0, indexFloor: 0, feedback: 0,
		duration: N / fs, fs, amp: 1, attack: 0, release: 0 })
	is(d.length, N)
	let binHz = fs / N
	let mag = k => dftMag(d, freq + k * 256 * binHz, fs)
	let J = [0.22389, 0.57672, 0.35283, 0.12894] // J0..J3(2), Abramowitz & Stegun §9 tables
	for (let k = 1; k <= 3; k++) {
		almost(mag(k) / mag(0), J[k] / J[0], (J[k] / J[0]) * 0.03, `J${k}/J0 sideband ratio`)
		almost(mag(k), mag(-k), mag(k) * 0.01, `upper/lower sideband symmetry k=${k}`)
	}
})

test('fm — index 0 collapses to a pure carrier sine', () => {
	let fs = 48000, N = 32768, freq = 2048 * fs / N, binHz = fs / N
	let d = fm(freq, { ratio: 0.125, index: 0, duration: N / fs, fs, amp: 1, attack: 0, release: 0 })
	let carrier = dftMag(d, freq, fs), side = dftMag(d, freq + 256 * binHz, fs)
	ok(side < carrier * 1e-3, `non-carrier energy ≥60dB below carrier (${(20 * Math.log10(side / carrier)).toFixed(0)}dB)`)
})

test('fm — feedback broadens the modulator spectrum beyond the fundamental sideband pair', () => {
	let fs = 48000, N = 32768, freq = 2048 * fs / N, ratio = 0.125, binHz = fs / N, index = 0.5
	let sig = d => {
		let peak = dftMag(d, freq, fs), n = 0
		for (let k = -4; k <= 4; k++) if (k !== 0 && dftMag(d, freq + k * 256 * binHz, fs) / peak >= 0.05) n++
		return n
	}
	let d0 = fm(freq, { ratio, index, feedback: 0, duration: N / fs, fs, amp: 1, attack: 0, release: 0 })
	let d1 = fm(freq, { ratio, index, feedback: Math.PI / 4, duration: N / fs, fs, amp: 1, attack: 0, release: 0 })
	let n0 = sig(d0), n1 = sig(d1)
	ok(n0 <= 2 && n1 >= 5 && n1 > n0, `feedback 0 -> ${n0} significant sidebands, feedback>0 -> ${n1}`)
})

test('fm — serial op stack produces combination-tone energy a single op lacks', () => {
	let fs = 48000, N = 32768, freq = 2048 * fs / N, binHz = fs / N
	let targetFreq = (2048 + 256 + 128) * binHz
	let stack = fm(freq, { ops: [{ ratio: 0.0625, index: 3 }, { ratio: 0.125, index: 4 }],
		duration: N / fs, fs, amp: 1, attack: 0, release: 0 })
	let single = fm(freq, { ratio: 0.125, index: 4, duration: N / fs, fs, amp: 1, attack: 0, release: 0 })
	let mStack = dftMag(stack, targetFreq, fs), mSingle = dftMag(single, targetFreq, fs)
	let db = 20 * Math.log10(mStack / Math.max(mSingle, 1e-12))
	ok(db >= 20, `stack combination tone ${db.toFixed(0)}dB above single-op at the same bin`)
})

test('fm — deterministic; bell/epiano presets render, correct length, finite, non-silent', () => {
	let a = fm(300, { ops: [{ ratio: 0.5, index: 3, feedback: 1 }, { ratio: 1.2, index: 2 }], duration: 0.2 })
	let b = fm(300, { ops: [{ ratio: 0.5, index: 3, feedback: 1 }, { ratio: 1.2, index: 2 }], duration: 0.2 })
	ok(a.every((v, i) => v === b[i]), 'identical buffers for identical calls')
	let bl = bell(220), ep = epiano(220)
	is(bl.length, Math.round(4 * 44100))
	is(ep.length, Math.round(1.5 * 44100))
	ok(bl.every(isFinite) && ep.every(isFinite), 'finite')
	ok(bl.some(v => Math.abs(v) > 0.01) && ep.some(v => Math.abs(v) > 0.01), 'non-silent')
})

// peak magnitude within ±tol bins of a target bin (accommodates the ±1 bin tolerance the
// modal tests below are specified against)
function peakNear (d, targetBin, fs, N, tol = 1) {
	let best = 0
	for (let b = targetBin - tol; b <= targetBin + tol; b++) best = Math.max(best, dftMag(d, b * fs / N, fs))
	return best
}
// local noise-floor estimate: average magnitude over bins scattered away from any mode
function localFloor (d, fs, N, excludeBins) {
	let sum = 0, n = 0
	for (let i = 1; i <= 12; i++) {
		let b = Math.round(N * 0.37 * i / 12) % (N / 2) + 3
		if (excludeBins.some(e => Math.abs(e - b) < 3)) continue
		sum += dftMag(d, b * fs / N, fs); n++
	}
	return sum / n
}

test('modal — bar (free-free beam) partial ratios match Fletcher & Rossing eigenvalues', () => {
	// F&R free-free bar: fk/f1 = (λk/λ1)², λ = [4.7300, 7.8532, 10.9956, 14.1372]
	let fs = 48000, N = 32768, freq = 512 * fs / N // exact bin 512 -> 750 Hz
	// damping:0 and a neutral strike keep every mode ringing at full strength through the
	// window — HF damping and strike-position nulling are exercised by their own tests below
	let d = modal(freq, { model: 'bar', nmodes: 4, damping: 0, strike: 0.29, exciter: 'impulse', duration: N / fs, fs, amp: 1 })
	let ratios = [1, 2.7565, 5.4039, 8.9330]
	let floor = localFloor(d, fs, N, ratios.map(r => Math.round(512 * r)))
	for (let r of ratios) {
		let peak = peakNear(d, Math.round(512 * r), fs, N, 1)
		ok(peak > floor * Math.pow(10, 30 / 20), `ratio ${r}: peak ${(20 * Math.log10(peak / floor)).toFixed(0)}dB above floor`)
	}
})

test('modal — membrane (ideal circular, fixed rim) partial ratios match Fletcher & Rossing Table 3.2', () => {
	let fs = 48000, N = 32768, freq = 512 * fs / N
	let d = modal(freq, { model: 'membrane', nmodes: 4, exciter: 'impulse', duration: N / fs, fs, amp: 1 })
	let ratios = [1, 1.5933, 2.1355, 2.2954] // modes (01)(11)(21)(02)
	let floor = localFloor(d, fs, N, ratios.map(r => Math.round(512 * r)))
	for (let r of ratios) {
		let peak = peakNear(d, Math.round(512 * r), fs, N, 1)
		ok(peak > floor * Math.pow(10, 30 / 20), `ratio ${r}: peak ${(20 * Math.log10(peak / floor)).toFixed(0)}dB above floor`)
	}
})

test('modal — tube-closed carries odd harmonics only', () => {
	let fs = 48000, N = 32768, freq = 512 * fs / N
	let d = modal(freq, { model: 'tube-closed', nmodes: 4, damping: 0, strike: 0.29, exciter: 'impulse', duration: N / fs, fs, amp: 1 })
	let m1 = dftMag(d, freq, fs), m2 = dftMag(d, 2 * freq, fs), m3 = dftMag(d, 3 * freq, fs), m4 = dftMag(d, 4 * freq, fs)
	ok(m3 > m1 * 0.05, 'sanity: 3rd harmonic (mode 2) is actually present')
	ok(m2 < m3 * Math.pow(10, -40 / 20), `2f1 ≥40dB below 3f1 (${(20 * Math.log10(m2 / m3)).toFixed(0)}dB)`)
	ok(m4 < m3 * Math.pow(10, -40 / 20), `4f1 ≥40dB below 3f1 (${(20 * Math.log10(m4 / m3)).toFixed(0)}dB)`)
})

test('modal — per-mode T60 decays -60dB by t60 seconds', () => {
	let fs = 44100, freq = 440
	let d = modal(freq, { modes: [{ ratio: 1, t60: 0.5 }], exciter: 'impulse', duration: 0.6, fs, amp: 1 })
	let m0 = dftMag(d.subarray(0, Math.round(0.05 * fs)), freq, fs)
	let m1 = dftMag(d.subarray(Math.round(0.5 * fs), Math.round(0.55 * fs)), freq, fs)
	almost(20 * Math.log10(m1 / m0), -60, 3, 'amplitude window at t=0.5s is -60dB vs t=0')
})

test('modal — string strike at 0.5 kills even harmonics (sin(kπ/2)=0)', () => {
	let fs = 48000, N = 32768, freq = 512 * fs / N
	let d = modal(freq, { model: 'string', strike: 0.5, nmodes: 4, exciter: 'impulse', duration: N / fs, fs, amp: 1 })
	let m1 = dftMag(d, freq, fs), m2 = dftMag(d, 2 * freq, fs), m3 = dftMag(d, 3 * freq, fs), m4 = dftMag(d, 4 * freq, fs)
	let oddAvg = (m1 + m3) / 2
	ok(m2 < oddAvg * Math.pow(10, -35 / 20), `2f1 ≥35dB below odd average (${(20 * Math.log10(m2 / oddAvg)).toFixed(0)}dB)`)
	ok(m4 < oddAvg * Math.pow(10, -35 / 20), `4f1 ≥35dB below odd average (${(20 * Math.log10(m4 / oddAvg)).toFixed(0)}dB)`)
})

test('modal — string inharmonicity sharpens partial 4 to 4·f1·√(1+16B)', () => {
	let fs = 48000, N = 32768, freq = 512 * fs / N, B = 0.001
	let d = modal(freq, { model: 'string', nmodes: 4, strike: 0.29, inharmonicity: B, exciter: 'impulse', duration: N / fs, fs, amp: 1 })
	let predictedBin = Math.round(4 * freq * Math.sqrt(1 + 16 * B) * N / fs)
	let naiveBin = 4 * 512
	ok(Math.abs(predictedBin - naiveBin) >= 10, 'sanity: prediction meaningfully differs from the naive (uninharmonic) bin')
	let floor = localFloor(d, fs, N, [512, 1024, 1536, predictedBin])
	let atPredicted = peakNear(d, predictedBin, fs, N, 1)
	let atNaive = dftMag(d, naiveBin * fs / N, fs)
	ok(atPredicted > floor * Math.pow(10, 15 / 20), 'predicted (shifted) bin carries real energy')
	ok(atPredicted > atNaive * 3, 'shifted bin measurably louder than the naive unshifted bin')
})

test('modal — custom modes ring at exactly the given ratios', () => {
	let fs = 48000, N = 32768, freq = 512 * fs / N
	let d = modal(freq, { modes: [{ ratio: 1 }, { ratio: 2.5 }], exciter: 'impulse', duration: N / fs, fs, amp: 1 })
	let floor = localFloor(d, fs, N, [512, 1280])
	ok(peakNear(d, 512, fs, N, 1) > floor * Math.pow(10, 30 / 20), 'mode 1 (ratio 1) present')
	ok(peakNear(d, 1280, fs, N, 1) > floor * Math.pow(10, 30 / 20), 'mode 2 (ratio 2.5) present')
})

test('modal — deterministic, finite, default duration covers t60, all models render', () => {
	let a = modal(300, { model: 'plate', seed: 5 }), b = modal(300, { model: 'plate', seed: 5 })
	ok(a.every((v, i) => v === b[i]), 'identical buffers for identical calls')
	ok(a.every(isFinite), 'finite')
	let d = modal(300, { model: 'membrane', t60: 1.5, exciter: 'noise', seed: 3 })
	is(d.length, Math.round((1.5 * 1.2 + 0.05) * 44100))
	for (let model of ['string', 'bar', 'membrane', 'plate', 'tube-open', 'tube-closed']) {
		let m = modal(220, { model, duration: 0.3 })
		ok(m.every(isFinite) && m.some(v => Math.abs(v) > 0.001), `${model} renders, finite, non-silent`)
	}
})

// --- audit 2026-07-10: generator signature unification (freq, opts) + poly contract ---

test('poly — drum membrane as voice renders at note pitch (was: silent defaults)', () => {
	let out = poly([{ time: 0, freq: 880, duration: 0.3, velocity: 1 }], { voice: membrane, fs: 44100 })
	// membrane sweeps down onto freq; measure the tail where drop has settled
	let tail = out.subarray(Math.round(0.15 * 44100), Math.round(0.25 * 44100))
	let zc = 0
	for (let i = 1; i < tail.length; i++) if (tail[i - 1] < 0 && tail[i] >= 0) zc++
	let est = zc / (tail.length / 44100)
	ok(Math.abs(est - 880) < 880 * 0.15, 'membrane voice pitched at note freq: ~' + est.toFixed(0) + ' Hz (want ≈880)')
	ok(out.length >= Math.round(0.3 * 44100), 'note duration respected')
})

test('poly — voiceOpts forwards per-voice config (fm ratio/index)', () => {
	let bright = poly([{ time: 0, freq: 440, duration: 0.2 }], { voice: fm, voiceOpts: { ratio: 2, index: 8 }, fs: 44100 })
	let dull = poly([{ time: 0, freq: 440, duration: 0.2 }], { voice: fm, voiceOpts: { ratio: 2, index: 0 }, fs: 44100 })
	// spectral spread ∝ index: brighter render has more sign changes
	let zcOf = (d) => { let z = 0; for (let i = 1; i < d.length; i++) if (d[i - 1] < 0 && d[i] >= 0) z++; return z }
	ok(zcOf(bright) > zcOf(dull) * 1.3, 'index raises spectral spread via voiceOpts')
})

test('noise — duration in seconds (family convention)', () => {
	is(noise(0.5, { fs: 8000 }).length, 4000, '0.5 s at 8 kHz = 4000 samples')
	is(white(1, { fs: 1000 }).length, 1000)
	is(pinkNoise.name, 'pinkNoise', 'pink-noise filter still exported from package root')
})
