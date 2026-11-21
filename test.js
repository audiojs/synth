import test, { almost, ok, is } from 'tst'
// tst starts a file's tests once their count has stood for 10 ms, which a top-level await below can outlast: the file
// starts them itself, after the last is registered
test.manual = true
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
	for (let i = 0; i < N; i++) { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; data[i] = (seed / 0x7fffffff) * 2 - 1 }
	audio.pinkNoise(data, {})
	let powerLow = 0, powerHigh = 0, countLow = 0, countHigh = 0, binSize = fs / N
	for (let f = 200; f < 400; f += binSize) { let m = dftMag(data, f, fs); powerLow += m * m; countLow++ }
	for (let f = 1600; f < 3200; f += binSize) { let m = dftMag(data, f, fs); powerHigh += m * m; countHigh++ }
	let diffDB = 10 * Math.log10((powerLow / countLow) / (powerHigh / countHigh))
	ok(diffDB > 4 && diffDB < 15, `pink noise slope: ${diffDB.toFixed(1)}dB (expect ~9dB)`)
})


import { noise, white, chirp, osc } from './index.js'
import { fft, ifft } from 'fourier-transform'

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

import { pink, brown, blue, violet, noiseDrum } from './index.js'

// x ← (1103515245·x + 12345) mod 2³¹ in exact integers: glibc's random_r TYPE_0 (stdlib/random_r.c),
// period 2³¹ by Hull–Dobell (c odd, a ≡ 1 mod 4); the generators read x as x / (2³⁰ − 1) − 1
function lcgExact (seed, n) {
	let x = BigInt(seed), d = new Float64Array(n)
	for (let i = 0; i < n; i++) { x = (x * 1103515245n + 12345n) % 2n ** 31n; d[i] = Number(x) / 0x3fffffff - 1 }
	return d
}

test("noise: white, pluck, noiseDrum and modal's noise burst follow the LCG exactly (a double product past 2⁵³ parted from it at the second sample)", () => {
	let n = 11025, x1 = lcgExact(1, n), x9 = lcgExact(9, n)
	let w = white(n / 44100, { seed: 1 })
	is(w.findIndex((v, i) => v !== Math.fround(0.9 * x1[i])), -1, 'white, seed 1')
	let p = pluck(44100 / n, { seed: 9, duration: n / 44100 }) // one period long: the burst itself
	is(p.findIndex((v, i) => v !== Math.fround(0.7 * x9[i])), -1, 'pluck, seed 9')
	let d = noiseDrum() // seed 9, 0.25 s
	is(d.findIndex((v, i) => v !== Math.fround(0.7 * x9[i] * Math.exp(-i / n * 7))), -1, 'noiseDrum, seed 9')
	// one mode at fs/4 that dies within a sample (r ≈ e⁻¹⁵⁷, sin θ = 1) passes the 5 ms burst through
	let m = modal(24000, { modes: [{ ratio: 1, gain: 1, t60: 1e-6 }], exciter: 'noise', seed: 9, amp: 1, fs: 96000, duration: 0.01 })
	is(m.subarray(0, 480).findIndex((v, i) => v !== Math.fround(x9[i])), -1, 'modal noise burst, seed 9, 96 kHz')
})

// Brent's cycle detection over a stream: a pair of consecutive samples stands for the state (a state
// that recurs repeats every pair after it). A state revisited within 2²² steps shows by sample 2²³:
// Brent's window 2ᵏ ≤ 2²² then spans both the tail before the cycle and the cycle
function recurrence (d) {
	let power = 1, lam = 1, t = 0
	for (let h = 1; h + 1 < d.length; h++, lam++) {
		if (d[t] === d[h] && d[t + 1] === d[h + 1]) return h - t
		if (power === lam) { t = h; power *= 2; lam = 0 }
	}
	return Infinity
}

test('noise: white revisits no state within 2²² steps from seeds 1, 9, 7920, 65536 (was: a loop of 10,466 samples, of 220 from seed 9)', () => {
	for (let seed of [1, 9, 7920, 65536]) {
		let r = recurrence(white((2 ** 23 + 1) / 44100, { seed }))
		is(r, Infinity, `seed ${seed}: ${r === Infinity ? 'no state recurs' : 'repeats every ' + r + ' samples'}`)
	}
})

// normalized correlation Σ a[i]·b[i+k] / √(Σa²·Σb²), means removed, by a zero-padded FFT: lag k at [k], −k at [N − k]
function xcorr (a, b) {
	let N = 2 ** Math.ceil(Math.log2(2 * Math.max(a.length, b.length)))
	let [pa, ea] = centered(a, N), [pb, eb] = centered(b, N)
	let [ar, ai] = fft(pa).map(v => v.slice()), [br, bi] = fft(pb)
	let re = ar.map((v, k) => v * br[k] + ai[k] * bi[k]), im = ar.map((v, k) => v * bi[k] - ai[k] * br[k])
	return ifft(re, im).map(v => v / Math.sqrt(ea * eb))
}
function centered (x, N) {
	let m = x.reduce((s, v) => s + v, 0) / x.length, d = new Float64Array(N), e = 0
	for (let i = 0; i < x.length; i++) { d[i] = x[i] - m; e += d[i] * d[i] }
	return [d, e]
}
const peakLag = (c, L, from = 1) => { let m = 0; for (let k = from; k <= L; k++) m = Math.max(m, Math.abs(c[k]), Math.abs(c[(c.length - k) % c.length])); return m }

test("noise: white is uncorrelated at every lag up to 2¹⁶, and so are the atom's channels (seed + 7919·c)", () => {
	let dur = 2 ** 20 / 44100, L = 2 ** 16
	for (let seed of [1, 9]) {
		let w = white(dur, { seed }), r = peakLag(xcorr(w, w), L)
		ok(r < 0.02, `seed ${seed}: |r| ≤ ${r.toFixed(4)} at lags 1..${L}`)
	}
	let r = peakLag(xcorr(white(dur, { seed: 1 }), white(dur, { seed: 7920 })), L, 0)
	ok(r < 0.02, `seeds 1 and 7920 (channels 0 and 1): |r| ≤ ${r.toFixed(4)} at lags −${L}..${L}`)
})

test('noise: pink −3, brown −6 dB/oct within 0.3 over 125 Hz–8 kHz, 47 s from seeds 1 and 9', () => {
	let dur = 2 ** 21 / 44100
	for (let seed of [1, 9]) {
		let p = slopeDbPerOct(pink(dur, { seed }), 125, 8000), b = slopeDbPerOct(brown(dur, { seed }), 125, 8000)
		almost(p, -3, 0.3, `pink, seed ${seed}: ${p.toFixed(2)} dB/oct`)
		almost(b, -6, 0.3, `brown, seed ${seed}: ${b.toFixed(2)} dB/oct`)
	}
})

test('noise: the same seed gives the same samples, another seed other samples, every color', () => {
	let dur = 4096 / 44100
	for (let [name, f] of Object.entries({ white, pink, brown, blue, violet })) {
		let a = f(dur, { seed: 7 }), b = f(dur, { seed: 7 }), c = f(dur, { seed: 8 })
		ok(a.every((v, i) => v === b[i]), `${name}: seed 7 twice, the same samples`)
		let same = c.filter((v, i) => v === a[i]).length
		ok(same < a.length / 100, `${name}: seeds 7 and 8 share ${same} of ${a.length} samples`)
	}
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

// Spectrum of a steady tone: 2^16-point 4-term Blackman-Harris (sidelobes −92 dB). → the strongest component off
// the harmonic series below 16 kHz and each harmonic's level, dB re the fundamental's peak.
function lines (x, f0, fs) {
	let N = 1 << 16, w = new Float64Array(N)
	for (let i = 0; i < N; i++) { let a = 2 * Math.PI * i / N; w[i] = x[i] * (0.35875 - 0.48829 * Math.cos(a) + 0.14128 * Math.cos(2 * a) - 0.01168 * Math.cos(3 * a)) }
	let [re, im] = fft(w), P = k => re[k] * re[k] + im[k] * im[k], bin = fs / N, zone = new Uint8Array(N / 2)
	for (let h = 1; h * f0 < fs / 2; h++) for (let d = -8; d <= 8; d++) zone[Math.round(h * f0 / bin) + d] = 1
	// a harmonic's power: its main lobe's (±4 bins), free of the window's scalloping
	let peak = h => { let k = Math.round(h * f0 / bin), m = 0; for (let d = -4; d <= 4; d++) m += P(k + d); return m }
	let p1 = peak(1), off = 0
	for (let k = Math.ceil(20 / bin); k < 16000 / bin; k++) if (!zone[k]) off = Math.max(off, P(k))
	return { alias: 10 * Math.log10(off / p1), level: h => 10 * Math.log10(peak(h) / p1) }
}

test('osc — band-limited: no aliases below 16 kHz, harmonics at their ideal levels', () => {
	// naive, a 3520 Hz saw at 44.1 kHz aliases at −18 dB; the 64-tap BLEP leaves the analysis floor
	for (let fs of [44100, 48000]) for (let type of ['sawtooth', 'square', 'triangle']) for (let f of [110, 1760, 3520, 7040]) {
		let { alias } = lines(osc(f, { type, fs, duration: 1.6, amp: 1 }), f, fs)
		ok(alias < -90, `${type} ${f} Hz @ ${fs}: aliases ${alias.toFixed(0)} dB`)
	}
	// ideal band-limited levels: saw 1/h, square 1/h odd, triangle 1/h² odd (Fourier series), to 16 kHz
	let saw = lines(osc(440, { type: 'sawtooth', duration: 1.6, amp: 1 }), 440, 44100)
	for (let h of [2, 3, 10, 36]) almost(saw.level(h), -20 * Math.log10(h), 0.05, `saw h${h}`)
	let tri = lines(osc(440, { type: 'triangle', duration: 1.6, amp: 1 }), 440, 44100)
	for (let h of [3, 5, 35]) almost(tri.level(h), -40 * Math.log10(h), 0.05, `triangle h${h}`)
	// phase conventions kept: saw falls, square starts high, triangle falls from its peak
	let s = osc(100, { type: 'sawtooth', duration: 0.02, amp: 1 }), q = osc(100, { type: 'square', duration: 0.02, amp: 1 }), t = osc(100, { type: 'triangle', duration: 0.02, amp: 1 })
	ok(s[100] > s[200] && Math.abs(s[110] - 0.5) < 0.01, 'saw falls, 1 − 2t')
	ok(q[100] > 0.99 && q[300] < -0.99, 'square high on the first half')
	ok(Math.abs(t[110] - 0) < 0.01 && t[50] > t[100], 'triangle falls from 1 at t = 0')
})

test('osc atom — band-limited as osc(), in any block size', async () => {
	let { osc: atom } = await import('@audio/synth-osc/audio')
	let p = atom({ sampleRate: 44100, maxBlockSize: 300 }), n = 1 << 16, x = new Float32Array(n + 1000), prm = { freq: [3520], detune: [0], gain: [1], type: 'square' }
	for (let i = 0, b = 1; i < x.length; i += b, b = 1 + (b * 7) % 300) p([], [[x.subarray(i, Math.min(x.length, i + b))]], prm)
	ok(lines(x, 3520, 44100).alias < -90, 'no aliases')
	let o = osc(3520, { type: 'square', duration: x.length / 44100, amp: 1 })
	ok(x.every((v, i) => Math.abs(v - o[i]) < 1e-6), 'same samples as osc()')
})

import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// CONTRACT 1.0, process: "Allocate nothing". A warm process() in a child Node with a 1 MB young generation, counted over
// 2^16 blocks of 8 frames (a collection is 1 MB, so 16 bytes a block show), under the validator's flags: without
// concurrent recompilation V8 inlined neither blep's sums nor `wave` into the loop for square and triangle, and boxed
// their numbers. Each wave type, and each param moving every block, one case after another in one process. Where V8
// boxes a number moves with its version: measured on Node 20, 22 and 25
test('osc atom: allocates nothing in process, at each wave type and as its params move', { skip: +process.versions.node.split('.')[0] < 20 && 'measured on Node 20 and later', timeout: 120000 }, () => {
	let cases = [[{}], [{ type: 'sawtooth' }], [{ type: 'square' }], [{ type: 'triangle' }], [{}, 'freq', 100, 5000], [{ type: 'square' }, 'detune', -1200, 1200],
		[{ type: 'triangle' }, 'gain', 0, 1], [{}, 'type', 'sine', 'square'], [{}, 'type', 'triangle', 'sawtooth']]
	let child = `
		import { osc } from ${JSON.stringify(import.meta.resolve('@audio/synth-osc/audio'))}
		import { PerformanceObserver } from 'node:perf_hooks'
		let counts = []
		for (let [set, key, a, b] of JSON.parse(process.argv[1])) {
			let given = () => Object.fromEntries(Object.entries(osc.params).map(([k, s]) => [k, s.type === 'number' ? Float32Array.of(set[k] ?? s.default) : set[k] ?? s.default]))
			let params = given(), proc = osc({ sampleRate: 48000, maxBlockSize: 128, maxChannels: 1, params: given() }), ins = [], out = [[new Float32Array(8)]]
			let v = typeof a === 'number' ? params[key] : null, to = Float32Array.of(a ?? 0, b ?? 0)
			let move = !key ? i => {} : v ? i => { v[0] = to[i & 1] } : i => { params[key] = i & 1 ? b : a }
			let run = n => { for (let i = 0; i < n; i++) { move(i); proc(ins, out, params) } }
			run(1 << 15); globalThis.gc()
			let gcs = 0, seen = new PerformanceObserver(list => { gcs += list.getEntries().length }); seen.observe({ entryTypes: ['gc'] })
			run(1 << 16); await new Promise(done => setTimeout(done, 20)); seen.disconnect()
			counts.push(gcs)
		}
		console.log(JSON.stringify(counts))`
	let counts = JSON.parse(execFileSync(process.execPath, ['--max-semi-space-size=1', '--expose-gc', '--no-concurrent-recompilation', '--input-type=module', '-e', child, JSON.stringify(cases)], { encoding: 'utf8' }))
	cases.forEach(([set, key, a, b], k) => is(counts[k], 0, `${JSON.stringify(set)}${key ? `, ${key} ${a} ↔ ${b} each block` : ''}: ${counts[k]} collections in 2^16 blocks`))
})

// CONTRACT 1.0, process: "Allocate nothing", and Lifecycle: the processor "may allocate and take its time". A fresh
// module's first instance, built at sine, then called 3 times at each wave of `order`: the bytes of typed-array stores
// (V8's arrayBuffers, after two collections) its factory made, and each call made. In a child: a module builds its
// tables once, and this one's tests have built them. Two collections: the first can leave the stores Node's module
// loader read audio.js and blep.js into (20 children in 210 on Node 25), a second frees them, and freed across the
// factory they take its reading under the tables' size
function oscStores (order) {
	let child = `
		import { osc } from ${JSON.stringify(import.meta.resolve('@audio/synth-osc/audio'))}
		let ab = () => (globalThis.gc(), globalThis.gc(), process.memoryUsage().arrayBuffers), given = () => ({ freq: Float32Array.of(440), detune: Float32Array.of(0), gain: Float32Array.of(0.8), type: 'sine' })
		let a = ab(), proc = osc({ sampleRate: 48000, maxBlockSize: 128, maxChannels: 1, params: given() }), built = ab() - a, live = given(), out = [[new Float32Array(128)]], calls = []
		for (let type of ${JSON.stringify(order)}) for (let i = 0; i < 3; i++) { live.type = type; let b = ab(); proc([], out, live); calls.push(ab() - b) }
		console.log(JSON.stringify({ built, calls }))`
	return JSON.parse(execFileSync(process.execPath, ['--expose-gc', '--input-type=module', '-e', child], { encoding: 'utf8' }))
}
test('osc atom: the band-limited tables are built with the instance, once for the module; no call makes a store, whatever wave comes first (was: 131088 B at the first square, saw or triangle)', { timeout: 120000 }, () => {
	// blep.js tabulates ∫h and ∫(∫h − step) O = 128 points a sample over ±K = 32 samples: 2KO + 1 doubles each
	let tables = 2 * (2 * 32 * 128 + 1) * 8
	for (let order of [['sine', 'square', 'sawtooth', 'triangle'], ['square', 'sine', 'triangle', 'sawtooth'], ['sawtooth', 'triangle', 'sine', 'square'], ['triangle', 'sawtooth', 'square', 'sine']]) {
		let { built, calls } = oscStores(order)
		ok(built >= tables, `${order.join(' → ')}: the factory made ${built} B, the ${tables} B of the tables among them`)
		is(calls.filter(d => d !== 0).length, 0, `${order.join(' → ')}: bytes the calls made: ${calls.join(', ')}`)
	}
})

// A host as contract 1.0 asks one to be (Parameters, `smoothing` and Time; What a host owes, 3), for the oscillator:
// gain `from` until frame `at`, then `to`, reached by a linear ramp of the declared `smoothing` from the value in
// force; the call split at `at`, none longer than 32 frames while gain moves (nor past the ramp's end), each handed
// the values at its first frame as float32; otherwise calls of `cut()` frames. audio's toStream hands it the same
function oscHosted (m, n, { type = 'sine', from, to = from, at = Infinity, cut, sampleRate = 44100 }) {
	let live = { freq: Float32Array.of(440), detune: Float32Array.of(0), gain: Float32Array.of(from), type }
	let proc = m({ sampleRate, maxBlockSize: 1024, maxChannels: 1, params: { ...live, gain: Float32Array.of(from) } }), y = new Float32Array(n)
	let len = Math.max(1, Math.round(m.params.gain.smoothing * sampleRate))
	for (let i = 0, k; i < n; i += k) {
		k = Math.min(n - i, cut())
		if (i < at && i + k > at) k = at - i
		let d = i - at
		if (d >= 0 && d < len) { live.gain[0] = to + (from - to) * (1 - d / len); k = Math.min(k, 32, at + len - i) }
		else if (d >= len) live.gain[0] = to
		proc([], [[y.subarray(i, i + k)]], live)
	}
	return y
}
test("osc atom: a moving gain is the host's ramp 32 frames late, however the host cuts its calls; held, it is the value itself from the first sample (was: a step at each call)", async () => {
	let { osc: atom } = await import('@audio/synth-osc/audio'), { wave } = await import('@audio/synth-osc')
	let sr = 44100, n = 4096, at = 1000, len = Math.round(atom.params.gain.smoothing * sr), f32 = Math.fround
	let seed = 9, random = () => 1 + ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 8) % 1024
	// the ramp a host plays, 0.25 to 0.75 over `len` frames from `at` (contract 1.0, Parameters: `smoothing`)
	let r = f => f <= at ? 0.25 : f >= at + len ? 0.75 : 0.25 + 0.5 * (f - at) / len
	for (let type of ['sine', 'square']) {
		// the samples at gain 1: the phase advanced as process advances it, each sample the kernel's own wave()
		let w = new Float64Array(n), dt = 440 * 2 ** (0 / 1200) / sr
		for (let i = 0, t = 0; i < n; i++) { w[i] = wave(type, t, dt); t += dt; t -= Math.floor(t) }
		let held = oscHosted(atom, n, { type, from: 0.3, cut: random })
		ok(held.every((v, i) => Object.is(v, f32(f32(0.3) * w[i]))), `${type}: built at 0.3, 0.3 times the wave from the first sample, bit for bit`)
		// Each value a host hands is r rounded to float32, within 2^-25 of it (half an ulp under 1), and the line between
		// two as near; the output is rounded again, within 2^-25 (|y| < 1): |y − r(i − 32)·w| ≤ 2^-25·(1 + |w|)
		for (let [how, cut] of [['calls of 128', () => 128], ['calls of 1', () => 1], ['calls of 33', () => 33], ['random calls of 1 to 1024', random]]) {
			let y = oscHosted(atom, n, { type, from: 0.25, to: 0.75, at, cut }), worst = 0
			for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(y[i] - r(i - 32) * w[i]) / (2 ** -25 * (1 + Math.abs(w[i]))))
			ok(worst <= 1, `${type}, ${how}: the ramp 32 frames late times the wave, to ${worst.toFixed(3)} of float32's rounding`)
			let end = at + len + 32
			ok(y.subarray(end).every((v, i) => Object.is(v, f32(0.75 * w[end + i]))), `${type}, ${how}: 0.75 itself from 32 frames after the ramp, bit for bit`)
		}
	}
})

// A stream held at sine for 2^15 calls, then for 2^12 calls of 32 frames the gain moving or another wave: the
// deoptimizations V8 reports after the change (--trace-deopt-verbose) at a line of this package. Code V8 optimized
// for the sine falls back to code that boxes numbers (10 MB in the 1024 calls after the first square, measured on
// Node 25), when a path it never saw is taken: the factory has the oscillator's paths run before the first call
function oscDeopts (change) {
	let dir = dirname(fileURLToPath(import.meta.resolve('@audio/synth-osc/audio')))
	let child = `
		import { osc } from ${JSON.stringify(import.meta.resolve('@audio/synth-osc/audio'))}
		let given = () => ({ freq: Float32Array.of(440), detune: Float32Array.of(0), gain: Float32Array.of(0.8), type: 'sine' })
		let live = given(), proc = osc({ sampleRate: 48000, maxBlockSize: 128, maxChannels: 1, params: given() }), out = [[new Float32Array(128)]], short = [[new Float32Array(32)]]
		for (let i = 0; i < 1 << 15; i++) { live.type = 'sine'; proc([], out, live) }
		process.stdout.write('@@ change\\n')
		for (let i = 0; i < 1 << 12; i++) { ${change}; proc([], short, live) }`
	let trace = execFileSync(process.execPath, ['--trace-deopt-verbose', '--input-type=module', '-e', child], { encoding: 'utf8', maxBuffer: 1 << 28 })
	return trace.slice(trace.indexOf('@@ change')).split('\n').filter(l => l.includes('deoptimize at') && l.includes(dir))
}
test('osc atom: a stream held at sine that turns square, saw or triangle, or moves its gain, deoptimizes none of the oscillator\'s code', { skip: +process.versions.node.split('.')[0] < 20 && 'measured on Node 20 and later', timeout: 120000 }, () => {
	for (let [what, change] of [['gain moving', 'let k = i & 63; live.gain[0] = 0.25 + 0.5 * (k < 32 ? k : 64 - k) / 32'], ['square', "live.type = 'square'"], ['sawtooth', "live.type = 'sawtooth'"], ['triangle', "live.type = 'triangle'"]]) {
		let at = oscDeopts(change)
		is(at.length, 0, `${what}: ${at.length} deoptimizations${at.length ? `, at ${at.map(l => l.match(/([^/]+:\d+:\d+)>/)?.[1]).join(', ')}` : ''}`)
	}
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

test('rhythm manifest: bpm declares its unit, bpm, and clicks that many times a minute', async () => {
	let { rhythm: manifest } = await import('./packages/synth-rhythm/audio.js')
	is(manifest.params.bpm.unit, 'bpm', 'unit bpm (contract 1.0 § Parameters)')
	let out = [[new Float32Array(2 * 44100)]]
	manifest({ sampleRate: 44100 })([], out, { bpm: [90], beats: [4], freq: [1000], accentFreq: [1500], amp: [0.7] })
	let d = out[0][0], e = at => { let s = 0, i0 = Math.round(at * 44100); for (let i = i0; i < i0 + 600; i++) s += d[i] * d[i]; return s }
	// 90 a minute: a click every 60 / 90 s
	for (let k = 0; k < 3; k++) ok(e(k * 60 / 90) > e(k * 60 / 90 + 0.3) * 20, `click ${k} at ${(k * 60 / 90).toFixed(3)} s, silence 0.3 s after`)
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

test('wavetable: one table plays as is at any position; of two or three, position 0 plays the first, 1 the last, 0.5 the middle one or an even mix (was: one table threw)', () => {
	let N = 512, fs = 44100, f = 441
	let sine = new Float32Array(N), level = v => new Float32Array(N).fill(v)
	for (let i = 0; i < N; i++) sine[i] = Math.sin(2 * Math.PI * i / N)
	let play = (tables, position) => wavetable(f, { tables, position, duration: 0.05, fs, amp: 1 })
	// linear interpolation errs at most h²/8 · max|y''| (Lagrange remainder, n = 1): (2π/512)²/8 = 1.9e-5 on a unit sine
	for (let p of [0, 0.5, 1]) ok(play([sine], p).every((x, i) => Math.abs(x - Math.sin(2 * Math.PI * f * i / fs)) < 1e-4), `one table at ${p}: the sine at ${f} Hz`)
	// constant tables read back their level: which tables sound, and how much of each
	let sounds = (tables, p, v) => ok(play(tables, p).every(x => Math.abs(x - v) < 1e-6), `${tables.length} tables at ${p}: ${v}`)
	let two = [level(1), level(3)], three = [level(1), level(3), level(9)]
	for (let [p, v] of [[0, 1], [0.5, 2], [1, 3]]) sounds(two, p, v)
	for (let [p, v] of [[0, 1], [0.5, 3], [1, 9]]) sounds(three, p, v)
})

test('voice — enveloped, filtered, pitched, finite', () => {
	let v = voice(220, {})
	ok(v.every(isFinite))
	// the release ends at 0.03 of full scale (synth-envelope), times 0.7 and the wave's peak (1.09 band-limited)
	ok(v[v.length - 1] === 0 || Math.abs(v[v.length - 1]) < 0.025, 'released')
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

test('sfx — band-limited square and saw', () => {
	for (let shape of ['square', 'saw']) {
		let x = sfx({ freq: 3520, shape, attack: 0.001, sustain: 2, release: 0.01 })
		let { alias } = lines(x.subarray(441), 3520, 44100)
		ok(alias < -90, `${shape}: aliases ${alias.toFixed(0)} dB`)
	}
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

test('voice manifest — renders its note events (every name it uses is imported)', async () => {
	// The audio.js manifest once called midiToHz without importing it: a ReferenceError on the first note.
	let { voice: manifest } = await import('./packages/synth-voice/audio.js')
	// slots as contract 1.0 gives them, { time, kind, midi, velocity, id }: the note number is `midi` (was `pitch`)
	let proc = manifest({ sampleRate: 44100, events: [{ time: 0, kind: 'on', midi: 69, velocity: 1, id: 0 }, { time: 4410, kind: 'off', midi: 69, velocity: 0, id: 0 }] })
	let out = [[new Float32Array(8820)]]
	proc([], out, { type: 'sawtooth', attack: [.01], decay: [.1], sustain: [.7], release: [.1], fc: [2000], envAmount: [.5], amp: [.5] })
	let peak = 0
	for (let v of out[0][0]) peak = Math.max(peak, Math.abs(v))
	ok(peak > .1 && out[0][0].every(Number.isFinite), `A4 renders (peak ${peak.toFixed(3)})`)
	almost(zcFreq(out[0][0], 441, 4410), 440, 6, 'midi 69 sounds A4, 440 Hz (MIDI tuning standard); one crossing in this window is 5.6 Hz')
})

test('poly manifest: plays each note event at its slot\'s midi', async () => {
	let { poly: manifest } = await import('./packages/synth-poly/audio.js')
	// slots as contract 1.0 gives them: A4 for 0.5 s, then A5 to the end with no off; midi 69 = A4 = 440 Hz (MIDI tuning standard)
	let proc = manifest({ sampleRate: 44100, events: [{ time: 0, kind: 'on', midi: 69, velocity: 1, id: 0 }, { time: 22050, kind: 'off', midi: 69, velocity: 0, id: 0 }, { time: 22050, kind: 'on', midi: 81, velocity: 1, id: 1 }] })
	let out = [[new Float32Array(44100)]]
	proc([], out, { voices: [16], type: 'sine', amp: [.7] })
	ok(out[0][0].every(Number.isFinite), 'finite')
	almost(zcFreq(out[0][0], 2205, 19845), 440, 3, 'midi 69: 440 Hz')
	almost(zcFreq(out[0][0], 24255, 41895), 880, 3, 'midi 81: 880 Hz')
})

test('poly, voice and tonewheel manifests: a slot naming its note `pitch` plays as one naming it `midi`', async () => {
	// a host older than contract 1.0 names the note number `pitch`: C4 for a quarter second, then G4 at half velocity
	// to the end with no off
	let slots = key => [
		{ time: 0, kind: 'on', [key]: 60, velocity: 1, id: 0 },
		{ time: 11025, kind: 'off', [key]: 60, velocity: 0, id: 0 },
		{ time: 11025, kind: 'on', [key]: 67, velocity: .5, id: 1 },
	]
	for (let name of ['poly', 'voice', 'tonewheel']) {
		let { [name]: manifest } = await import(`./packages/synth-${name}/audio.js`)
		let params = Object.fromEntries(Object.entries(manifest.params).map(([k, p]) => [k, p.type === 'number' ? [p.default] : p.default]))
		let render = events => { let out = [[new Float32Array(22050)]]; manifest({ sampleRate: 44100, events })([], out, params); return out[0][0] }
		let midi = render(slots('midi')), pitch = render(slots('pitch')), both = render(slots('midi').map(e => ({ ...e, pitch: e.midi + 12 })))
		ok(peakOf(midi) > .05, `${name}: sounds (peak ${peakOf(midi).toFixed(3)})`)
		ok(pitch.every((v, i) => v === midi[i]), `${name}: \`pitch\` slots render what \`midi\` slots do, sample for sample`)
		ok(both.every((v, i) => v === midi[i]), `${name}: \`midi\` is read where a slot has both`)
	}
})

test('dx7 manifest: a slot naming its note `pitch` plays as one naming it `midi`; a host that hands no note events is an error', async () => {
	let { dx7: manifest } = await import('./packages/synth-dx7/audio.js')
	// C4 for 4096 frames, then G4 at half velocity to the end with no off, in calls of 128 frames, as a live host plays it
	let slots = key => [
		{ time: 0, kind: 'on', [key]: 60, velocity: 1, id: 0 },
		{ time: 4096, kind: 'off', [key]: 60, velocity: 0, id: 0 },
		{ time: 4096, kind: 'on', [key]: 67, velocity: .5, id: 1 },
	]
	let params = Object.fromEntries(Object.entries(manifest.params).map(([k, p]) => [k, p.type === 'number' ? [p.default] : p.default]))
	let play = evs => {
		let ctx = { sampleRate: 44100, maxBlockSize: 128, maxChannels: 1, params, events: [] }, proc = manifest(ctx), out = new Float32Array(16384)
		for (let f = 0; f < out.length; f += 128) {
			ctx.events = evs.filter(e => e.time >= f && e.time < f + 128).map(e => ({ ...e, time: e.time - f }))
			proc([], [[out.subarray(f, f + 128)]], params)
		}
		return out
	}
	let midi = play(slots('midi')), pitch = play(slots('pitch')), both = play(slots('midi').map(e => ({ ...e, pitch: e.midi + 12 })))
	ok(peakOf(midi) > .05, `sounds (peak ${peakOf(midi).toFixed(3)})`)
	ok(pitch.every((v, i) => v === midi[i]), '`pitch` slots render what `midi` slots do, sample for sample')
	ok(both.every((v, i) => v === midi[i]), '`midi` is read where a slot has both')
	let proc = manifest({ sampleRate: 44100, maxBlockSize: 128, maxChannels: 1, params })
	throws(() => proc([], [[new Float32Array(128)]], params), /no note events from the host/, 'no ctx.events: an error that says the host hands none')
})

test('voice — former option name `cutoff` still works as `fc`', () => {
	let a = voice(220, { fc: 1500, duration: 0.1 }), b = voice(220, { cutoff: 1500, duration: 0.1 }), c = voice(220, { duration: 0.1 })
	ok(a.every((v, i) => v === b[i]), '{ cutoff } ≡ { fc }')
	ok(a.some((v, i) => v !== c[i]), 'fc changes the sound')
})

// --- DX7 FM engine (synth-dx7): the Music Synthesizer for Android core, diffed against upstream ---

import { throws } from 'tst'
import { dx7, parseDx7, tonewheel, fitTonewheel } from './index.js'
import { render as dx7Render, unpack as dx7Unpack, INIT as DX7_INIT } from '@audio/synth-dx7'
import { reference as msfa, MSFA } from './test/msfa.js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ref = msfa() // null without the upstream checkout, a C++ compiler or x86-64 execution: those tests skip
const ROM1A = join(MSFA, 'app/src/main/res/raw/rom1a.syx') // Yamaha's factory voices as bundled by MSFA; not redistributed here

// VCED parameter maxima (DX7 Operating Manual, MIDI data format), for random valid voices
const DX7_OP = [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 3, 3, 7, 3, 7, 99, 1, 31, 99, 14]
const DX7_GLOBAL = [99, 99, 99, 99, 99, 99, 99, 99, 31, 7, 1, 99, 99, 99, 99, 1, 5, 7, 48]
const lcg = (seed) => (n) => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % (n + 1) } // imul: exact mod 2³²
function dx7Random (rnd) {
	let p = new Uint8Array(155)
	for (let op = 0; op < 6; op++) DX7_OP.forEach((m, i) => p[op * 21 + i] = rnd(m))
	DX7_GLOBAL.forEach((m, i) => p[126 + i] = rnd(m))
	return p
}
// VMEM packing per the DX7 manual's layout, the inverse of unpack
function dx7Pack (p) {
	let b = new Uint8Array(128)
	for (let op = 0; op < 6; op++) {
		let o = op * 21, k = op * 17
		for (let i = 0; i < 11; i++) b[k + i] = p[o + i]
		b[k + 11] = p[o + 11] | p[o + 12] << 2
		b[k + 12] = p[o + 13] | p[o + 20] << 3
		b[k + 13] = p[o + 14] | p[o + 15] << 2
		b[k + 14] = p[o + 16]
		b[k + 15] = p[o + 17] | p[o + 18] << 1
		b[k + 16] = p[o + 19]
	}
	for (let i = 0; i < 9; i++) b[102 + i] = p[126 + i]
	b[111] = p[135] | p[136] << 3
	for (let i = 0; i < 4; i++) b[112 + i] = p[137 + i]
	b[116] = p[141] | p[142] << 1 | p[143] << 4
	for (let i = 0; i < 11; i++) b[117 + i] = p[144 + i]
	return b
}
// the same voice, note, velocity and length in both engines: count differing int32 samples
function dx7Diff (patch, { note = 60, velocity = 100, fs = 44100, duration = 0.3, release = 0.2, msfa = true } = {}) {
	let a = dx7Render(patch, { note, velocity, fs, duration, release, msfa })
	let b = ref.note(patch, { note, velocity, fs, blocks: a.length / 64, keyup: Math.round(duration * fs / 64) })
	let d = 0, peak = 0
	for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) d++; peak = Math.max(peak, Math.abs(b[i])) }
	return { d, n: a.length, peak }
}
const peakOf = (d) => d.reduce((m, v) => Math.max(m, Math.abs(v)), 0)

test('dx7: INIT voice: a sine at the key; OP1 at level 99 peaks at 2^25 of the 2^28 full scale', () => {
	let d = dx7(440, { duration: 0.5, release: 0.2 })
	is(d.length, Math.round(0.7 * 44100))
	almost(peakOf(d), 0.125, 1e-4, `peak ${peakOf(d).toFixed(5)}`)
	almost(zcFreq(d, 2205, 19845), 440, 1, 'pitch')
})

test('dx7: parse: cartridge (VMEM), single voice (VCED) and headerless data give the same voices', () => {
	let rnd = lcg(3), voices = Array.from({ length: 32 }, () => dx7Random(rnd))
	voices.forEach((v, i) => v.set([...`VOICE ${String(i).padStart(2)}  `].map(c => c.charCodeAt(0)), 145))
	let bulk = new Uint8Array(4096)
	voices.forEach((v, i) => bulk.set(dx7Pack(v), i * 128))
	let sum = bulk.reduce((a, b) => a + b, 0)
	let bank = parseDx7(Uint8Array.from([0xf0, 0x43, 0x00, 0x09, 0x20, 0x00, ...bulk, (128 - sum % 128) % 128, 0xf7]))
	is(bank.length, 32)
	ok(bank.every((b, i) => b.patch.every((x, k) => x === voices[i][k])), 'VMEM unpacks to the packed voices')
	is(bank[7].name, 'VOICE  7')
	ok(parseDx7(Uint8Array.from([0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b, ...voices[5], 0, 0xf7]))[0].patch.every((x, k) => x === voices[5][k]), 'VCED')
	ok(parseDx7(bulk).length === 32 && parseDx7(voices[5])[0].patch.every((x, k) => x === voices[5][k]), 'headerless 4096 and 155 bytes')
	let bad = Uint8Array.from(voices[0]); bad[134] = 40; bad[0] = 120
	let c = parseDx7(bad)[0].patch
	ok(c[134] === 31 && c[0] === 99, 'out-of-range values clamp to the documented maxima')
})

test('dx7: parse: a 16-bit byte count (10 00) reads as 4096; messages other than voices are skipped', () => {
	let rnd = lcg(5), voices = Array.from({ length: 32 }, () => dx7Random(rnd))
	let bulk = new Uint8Array(4096)
	voices.forEach((v, i) => bulk.set(dx7Pack(v), i * 128))
	let vmem = count => [0xf0, 0x43, 0x00, 0x09, ...count, ...bulk, 0, 0xf7]
	let same = bank => bank.length === 32 && bank.every((b, i) => b.patch.every((x, k) => k >= 145 || x === voices[i][k]))
	ok(same(parseDx7(Uint8Array.from(vmem([0x10, 0x00])))), '10 00: the byte count as a plain 16-bit 4096')
	ok(same(parseDx7(Uint8Array.from(vmem([0x20, 0x00])))), '20 00: the 7-bit count the manual gives')
	// a Yamaha message of another format (7E, universal bulk dump) and a Roland GS reset
	let perf = [0xf0, 0x43, 0x00, 0x7e, 0x00, 0x0e, ...[...'LM  8952PM'].map(c => c.charCodeAt(0)), 1, 2, 3, 4, 0, 0xf7]
	let roland = [0xf0, 0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x7f, 0x00, 0x41, 0xf7]
	ok(same(parseDx7(Uint8Array.from([...perf, ...vmem([0x20, 0x00]), ...roland]))), 'the voices between the other two')
	is(parseDx7(Uint8Array.from([...perf, 0xf0, 0x43, 0x00, 0x00, 0x01, 0x1b, ...voices[5], 0, 0xf7])).length, 1, 'a single voice after a performance')
	throws(() => parseDx7(Uint8Array.from(perf)), /no voices found \(unsupported sysex format 126/)
	throws(() => parseDx7(Uint8Array.from(roland)), /no voices found \(not a Yamaha sysex message\)/)
	// a parameter change (F0 43 1n: group 0, parameter 1, value 1B) that reads like a VCED header must not swallow the bank
	let change = [0xf0, 0x43, 0x10, 0x00, 0x01, 0x1b, 0xf7]
	ok(same(parseDx7(Uint8Array.from([...change, ...vmem([0x20, 0x00])]))), 'the bank after a parameter change')
	throws(() => parseDx7(Uint8Array.from(change)), /no voices found \(a parameter change, not a bulk dump\)/)
	throws(() => parseDx7(Uint8Array.from(vmem([0x20, 0x00]).slice(0, 1000))), /truncated/)
	throws(() => parseDx7(Uint8Array.from([...vmem([0x20, 0x00]), 0xf0, 0x43])), /truncated/, 'a dangling header at the end')
})

test('dx7: amplitude EG on the DX7 clock at any fs: 0.2819·2^(q/4)·(1 + (q mod 4)/4) dB/s (MSFA wiki Dx7Envelope)', () => {
	let p = Uint8Array.from(DX7_INIT)
	p.set([99, 50, 99, 99, 99, 0, 0, 0], 5 * 21) // OP1 rates, levels: instant attack, then rate 50 down to 0
	let q = (50 * 41) >> 6, want = 0.2819 * 2 ** (q >> 2) * (1 + (q & 3) / 4) // 72.17 dB/s
	const slope = (fs, msfa) => {
		let d = dx7Render(p, { note: 69, velocity: 100, fs, duration: 1.5, release: 0.1, msfa }), pts = []
		for (let i = 0; i + 1024 <= d.length; i += 1024) {
			let m = 0
			for (let j = i; j < i + 1024; j++) m = Math.max(m, Math.abs(d[j]))
			let db = 20 * Math.log10(m / 2 ** 25)
			if (db < -10 && db > -50) pts.push([(i + 512) / fs, db])
		}
		let n = pts.length, st = 0, sd = 0, stt = 0, std = 0
		for (let [t, db] of pts) { st += t; sd += db; stt += t * t; std += t * db }
		return (n * std - st * sd) / (n * stt - st * st)
	}
	for (let fs of [44100, 48000, 96000]) {
		almost(slope(fs, false), -want, want * 0.01, `${fs} Hz: ${slope(fs, false).toFixed(2)} dB/s, documented ${want.toFixed(2)}`)
		almost(slope(fs, true), -want * fs / 49096, want * 0.01, `msfa: × ${fs}/49096, upstream counts DX7 samples`)
	}
})

test('dx7: transpose shifts the key as on the DX7; velocity sensitivity scales the level; release runs to silence', () => {
	let up = Uint8Array.from(DX7_INIT); up[144] = 36 // transpose C4: one octave up
	almost(zcFreq(dx7(220, { patch: up, duration: 0.5, release: 0 }), 2205, 19845), 440, 1, 'A3 key sounds A4')
	let kvs = Uint8Array.from(DX7_INIT); kvs[5 * 21 + 15] = 7
	let loud = peakOf(dx7(440, { patch: kvs, velocity: 1, duration: 0.3, release: 0 }))
	let soft = peakOf(dx7(440, { patch: kvs, velocity: 0.4, duration: 0.3, release: 0 }))
	ok(loud > 2 * soft, `KVS 7, velocity 1 vs 0.4: ${(20 * Math.log10(loud / soft)).toFixed(1)} dB`)
	let rel = dx7(440, { duration: 0.3 })
	ok(rel.length < 0.4 * 44100 && rel[rel.length - 1] === 0, `release ends silent ${(rel.length / 44100 - 0.3).toFixed(3)} s after key-up`)
})

test('dx7: bit-exact with upstream MSFA: 32 algorithms × feedback 0..7', { skip: !ref, timeout: 120000 }, () => {
	for (let alg = 0; alg < 32; alg++) {
		let p = Uint8Array.from(DX7_INIT)
		for (let op = 0; op < 6; op++) p.set([99, 60 + 5 * op, 40, 70, 99, 90 - 7 * op, 70, 0, 39, 0, 0, 0, 0, 0, 0, 0, 72 + 5 * op, 0, op + 1, 7 * op, 6 + op % 3], op * 21)
		p[134] = alg; p[135] = alg % 8
		let r = dx7Diff(p, { note: 48 + alg % 24 })
		ok(!r.d && r.peak > 1 << 20, `algorithm ${alg + 1}, feedback ${alg % 8}: ${r.d} of ${r.n} samples differ`)
	}
})

test('dx7: bit-exact with upstream MSFA: random voices (EGs, level and rate scaling, velocity, pitch EG, LFO, unpack)', { skip: !ref, timeout: 120000 }, () => {
	let rnd = lcg(7)
	for (let i = 0; i < 24; i++) {
		let p = dx7Random(rnd), fs = [44100, 48000, 49096][i % 3], note = 24 + rnd(84), velocity = 1 + rnd(126)
		// at 49096 Hz the DX7-clock EG and upstream's per-sample EG coincide: the default path is diffed there
		let r = dx7Diff(p, { note, velocity, fs, msfa: fs !== 49096 })
		let bulk = dx7Pack(p), mine = dx7Unpack(bulk)
		ok(!r.d && ref.unpack(bulk).every((x, k) => x === mine[k]), `voice ${i}: algorithm ${p[134] + 1}, note ${note}, velocity ${velocity}, ${fs} Hz${fs === 49096 ? ' (DX7 clock)' : ''}: ${r.d} of ${r.n} differ`)
	}
})

test('dx7: bit-exact with upstream MSFA: fixed-frequency operators with detune, 6 LFO waves × sync × delay', { skip: !ref, timeout: 120000 }, () => {
	let rnd = lcg(11)
	for (let wave = 0; wave < 6; wave++) for (let sync = 0; sync < 2; sync++) {
		let p = dx7Random(rnd)
		p.set([20 + rnd(79), sync ? rnd(99) : 0, 50 + rnd(49), 0, sync, wave, 4 + rnd(3)], 137) // speed, delay, PMD, AMD, sync, wave, PMS
		for (let op = 1; op < 6; op += 2) { p[op * 21 + 17] = 1; p[op * 21 + 20] = rnd(14) } // fixed frequency, detune
		let r = dx7Diff(p, { note: 36 + rnd(48), velocity: 1 + rnd(126), duration: 0.8, release: 0.3 })
		ok(!r.d, `LFO wave ${wave}, sync ${sync}, delay ${p[138]}, PMD ${p[139]}, PMS ${p[143]}: ${r.d} of ${r.n} differ`)
	}
})

test('dx7: bit-exact with upstream MSFA: the ROM1A cartridge bundled with MSFA', { skip: !ref || !existsSync(ROM1A), timeout: 120000 }, () => {
	let bank = parseDx7(readFileSync(ROM1A))
	is(bank[10].name, 'E.PIANO 1')
	bank.forEach(({ name, patch }, i) => {
		let r = dx7Diff(patch, { note: 48 + i % 3 * 12, velocity: 64 + i, duration: 0.5, release: 0.5 })
		ok(!r.d, `${name}: ${r.d} of ${r.n} differ`)
	})
})

test('dx7: real-time factor per voice, CPU time', { timeout: 60000 }, () => {
	let p = dx7Random(lcg(5)), c0 = process.cpuUsage()
	for (let i = 0; i < 4; i++) dx7Render(p, { note: 60, duration: 2.5, release: 2.5 })
	let c = process.cpuUsage(c0), rtf = (c.user + c.system) / 1e6 / 20
	ok(rtf < 0.05, `RTF ${rtf.toExponential(2)}: ${(1 / rtf).toFixed(0)}× real time`)
})

// --- tonewheel organ (synth-tonewheel) and registration fit (synth-tonewheel-fit) ---

import { wheel, wheelHz, TAPS, PERCUSSION } from '@audio/synth-tonewheel'
const rotary = (await import('@audio/effect-rotary').catch(() => null))?.default
const freeverb = (await import('@audio/reverb-freeverb').catch(() => null))?.default

test('tonewheel: wheel frequencies from the gear ratios: A 440; +1.98/−0.71 cents from equal temperament; tierce 14 cents sharp', () => {
	is(wheelHz(46), 440)
	almost(wheelHz(1), 20 * 85 / 104 * 2, 1e-9, 'wheel 1: 20 rev/s · 85/104 · 2 teeth')
	almost(wheelHz(86), 4440, 1e-9, 'C# on the F# shaft: 20 · 37/32 · 192 teeth (HammondWiki)')
	let cents = Array.from({ length: 91 }, (_, i) => 1200 * Math.log2(wheelHz(i + 1) / (440 * 2 ** ((i - 45) / 12))))
	almost(Math.max(...cents), 1.98, 0.01, 'sharpest: top C#')
	almost(Math.min(...cents), -0.71, 0.01, 'flattest: G# (48/37)')
	let f8 = wheelHz(wheel(60, 2))
	almost(1200 * Math.log2(wheelHz(wheel(60, 6)) / (5 * f8)), 13.87, 0.05, "C4: 1 3/5' against 5 × 8'")
	almost(1200 * Math.log2(wheelHz(wheel(60, 4)) / (3 * f8)), -1.36, 0.05, "C4: 2 2/3' against 3 × 8'")
})

test('tonewheel: keys to wheels with foldback: rows of Table III, Hammond service manual', () => {
	const row = (midi) => Array.from({ length: 9 }, (_, d) => wheel(midi, d))
	is(row(36), [13, 20, 13, 25, 32, 37, 41, 44, 49], "key 1: the bottom octave's 16' repeats its 8'")
	is(row(48), [13, 32, 25, 37, 44, 49, 53, 56, 61], 'key 13')
	is(row(79), [44, 63, 56, 68, 75, 80, 84, 87, 80], "key 44: 1' folds back past wheel 91")
	is(row(96), [61, 80, 73, 85, 80, 85, 89, 80, 85], 'key 61')
	throws(() => wheel(35, 2), /manual/)
})

test('tonewheel: drawbar positions on the matching-transformer taps, 6..64 turns (US 1,956,350)', () => {
	let f = wheelHz(46), full = dftMag(tonewheel(440, { drawbars: '008000000', duration: 0.5 }), f, 44100)
	for (let n = 1; n < 8; n++) {
		let a = dftMag(tonewheel(440, { drawbars: `00${n}000000`, duration: 0.5 }), f, 44100)
		almost(a / full, TAPS[n] / 64, 1e-9, `position ${n}: ${(20 * Math.log10(a / full)).toFixed(2)} dB`)
	}
})

test("tonewheel: keys sharing a tonewheel add coherently: C4's 4' is C5's 8'", () => {
	let f = wheelHz(49)
	let one = dftMag(tonewheel(523.25, { drawbars: '008000000', duration: 0.5 }), f, 44100)
	let two = dftMag(tonewheel([261.63, 523.25], { drawbars: '008800000', duration: 0.5 }), f, 44100)
	almost(two / one, 2, 1e-3, `amplitude × ${(two / one).toFixed(5)} on the shared wheel`)
})

test("tonewheel: percussion: single trigger, 1' silenced, −60 dB in 1 s (fast) and 4 s (slow)", () => {
	let fs = 44100, f4 = wheelHz(wheel(69, 3))
	const at = (x, t, f) => dftMag(x.subarray(Math.round(t * fs), Math.round(t * fs) + 2048), f, fs)
	let pulled = tonewheel(440, { drawbars: '000000008', percussion: 'second', duration: 0.5 }), pushed = tonewheel(440, { drawbars: '000000000', percussion: 'second', duration: 0.5 })
	ok(pulled.every((v, i) => v === pushed[i]), "1' drawbar silent while the percussion keys through its contacts")
	for (let decay of ['fast', 'slow']) {
		let x = tonewheel(440, { drawbars: '000000000', percussion: 'second', percussionDecay: decay, duration: 1.2 })
		let db = 20 * Math.log10(at(x, 0.6, f4) / at(x, 0.1, f4)) / 0.5
		almost(db, -60 / PERCUSSION.t60[decay], 0.5, `${decay}: ${db.toFixed(1)} dB/s`)
	}
	let key = (time, midi) => ({ time, midi, duration: 0.45 })
	let legato = tonewheel([{ time: 0, midi: 69, duration: 1 }, { time: 0.5, midi: 72, duration: 0.5 }], { drawbars: '008000000', percussion: 'second', percussionDecay: 'slow' })
	let detached = tonewheel([key(0, 69), key(0.5, 72)], { drawbars: '008000000', percussion: 'second', percussionDecay: 'slow' })
	let c5 = wheelHz(wheel(72, 3))
	ok(at(detached, 0.51, c5) > 1.5 * at(legato, 0.51, c5), 'a key pressed while another is held does not retrigger')
})

test('tonewheel: scanner V1/V2/V3 swing pitch ±0.5/0.75/1.5% at 412 rpm (Hammond service manual)', () => {
	for (let [v, dev] of [['v1', 0.5], ['v2', 0.75], ['v3', 1.5]]) {
		let x = tonewheel(440, { drawbars: '008000000', duration: 2, vibrato: v }), zc = [], fr = []
		for (let i = 4410; i < 83790; i++) if (x[i - 1] < 0 && x[i] >= 0) zc.push(i - x[i] / (x[i] - x[i - 1]))
		for (let i = 1; i < zc.length; i++) fr.push(44100 / (zc[i] - zc[i - 1]))
		almost(Math.max(...fr) / 440 - 1, dev / 100, 2e-4, `${v}: +${(100 * (Math.max(...fr) / 440 - 1)).toFixed(3)}%`)
		almost(1 - Math.min(...fr) / 440, dev / 100, 2e-4, `${v}: −${(100 * (1 - Math.min(...fr) / 440)).toFixed(3)}%`)
	}
})

test('tonewheel manifest: note events play the drawbar params', async () => {
	let { tonewheel: manifest } = await import('./packages/synth-tonewheel/audio.js')
	let proc = manifest({ sampleRate: 44100, events: [{ time: 0, kind: 'on', midi: 69, velocity: 1, id: 0 }, { time: 22050, kind: 'off', midi: 69, velocity: 0, id: 0 }] })
	let out = [[new Float32Array(44100)]], params = Object.fromEntries(Object.entries(manifest.params).map(([k, p]) => [k, p.type === 'number' ? [p.default] : p.default]))
	proc([], out, params)
	let d = out[0][0]
	almost(dftMag(d.subarray(0, 22050), 440, 44100) / 11025, 0.8 / 9, 1e-3, "888000000: the 8' wheel at 0.8/9")
	ok(peakOf(d.subarray(22100)) === 0, 'silent after key-up')
})

test('tonewheel-fit: 888000000 comes back as itself, dry', () => {
	let r = fitTonewheel(tonewheel(261.63, { drawbars: '888000000' }), { freq: 261.63 })
	is(r.drawbars, '888000000')
	almost(r.score, 1, 1e-3, `score ${r.score.toFixed(4)}`)
	ok(r.percussion === null && r.vibrato === null, 'no percussion, no scanner')
})

// random registrations on keys C3..C5 (no foldback); canonical up to gain: loudest drawbar at 8
function randomRegistrations (n, seed, canonical = true) {
	let rnd = lcg(seed)
	return Array.from({ length: n }, () => {
		let r = Array.from({ length: 9 }, () => rnd(8))
		if (canonical || r.every(v => !v)) r[rnd(8)] = 8
		return { drawbars: r.join(''), freq: 440 * 2 ** ((48 + rnd(24) - 69) / 12) }
	})
}

test('tonewheel-fit: exact recovery of random registrations, dry and through every scanner setting (detected)', { timeout: 180000 }, () => {
	for (let vib of [false, 'v1', 'v2', 'v3', 'c1', 'c2', 'c3']) {
		let regs = randomRegistrations(10, 7), hits = 0, found = 0
		for (let { drawbars, freq } of regs) {
			let r = fitTonewheel(tonewheel(freq, { drawbars, duration: 1.5, vibrato: vib }), { freq })
			if (r.drawbars === drawbars) hits++
			if (r.vibrato === (vib || null)) found++
		}
		is(hits, regs.length, `${vib || 'dry'}: ${hits}/${regs.length} exact, setting found ${found}/${regs.length}`)
	}
	let regs = randomRegistrations(10, 8, false), hits = 0
	for (let { drawbars, freq } of regs) if (fitTonewheel(tonewheel(freq, { drawbars, duration: 1.5, amp: 0.5 }), { freq, amp: 0.5 }).drawbars === drawbars) hits++
	is(hits, regs.length, `known gain, any registration: ${hits}/${regs.length} exact`)
})

test('tonewheel-fit: percussion: harmonic, decay and volume', { timeout: 120000 }, () => {
	let regs = randomRegistrations(8, 9), i = 0
	for (let harmonic of ['second', 'third']) for (let decay of ['fast', 'slow']) for (let volume of ['normal', 'soft']) {
		let { freq } = regs[i], drawbars = regs[i++].drawbars.slice(0, 8) + '0' // percussion silences 1'
		if (!drawbars.includes('8')) drawbars = '8' + drawbars.slice(1)
		let r = fitTonewheel(tonewheel(freq, { drawbars, duration: 2, percussion: harmonic, percussionDecay: decay, percussionVolume: volume }), { freq })
		is([r.drawbars, r.percussion], [drawbars, { harmonic, decay, volume }], `${harmonic} ${decay} ${volume}`)
	}
})

test('tonewheel-fit: chords, and the key of a single note when no pitch is given', { timeout: 120000 }, () => {
	let rnd = lcg(12)
	for (let { drawbars, freq } of randomRegistrations(6, 13)) {
		let chord = [0, 4, 7].map(s => freq * 2 ** (s / 12))
		is(fitTonewheel(tonewheel(chord, { drawbars, duration: 1.5 }), { freq: chord }).drawbars, drawbars, `major triad ${drawbars}`)
	}
	for (let { drawbars } of randomRegistrations(6, 14)) {
		let key = 40 + rnd(40), fold = wheel(key, 8) === wheel(key, 5) // the top keys' 1' sounds on the 2' wheel: only their sum is heard
		let reg = '0' + drawbars[1] + '8' + drawbars.slice(3, 8) + (fold ? '0' : drawbars[8]) // 8' sounding, 16' off: the key is the pitch heard
		let r = fitTonewheel(tonewheel(440 * 2 ** ((key - 69) / 12), { drawbars: reg, duration: 1.5 }))
		ok(r.keys[0] === key && r.drawbars === reg, `key ${key} ${reg} → ${r.keys[0]} ${r.drawbars}`)
	}
	is(fitTonewheel(tonewheel(261.63, { drawbars: '888000000' })).drawbars, '008880000', "no pitch: 16' heard as the fundamental, key C3")
})

test('tonewheel-fit: through a Leslie (@audio/effect-rotary, two mics) and reverb (@audio/reverb-freeverb)', { skip: !rotary || !freeverb, timeout: 180000 }, () => {
	let fs = 44100
	const leslie = (speed) => (x) => { let L = Float64Array.from(x), R = Float64Array.from(x); rotary(L, R, { speed, fs }); return [L, R] }
	const room = (x) => freeverb(Float32Array.from(x), { fs })
	for (let [name, fx, floor] of [['Leslie chorale', leslie('chorale'), 0.9], ['Leslie tremolo', leslie('tremolo'), 0.9], ['reverb', room, 0.8]]) {
		let regs = randomRegistrations(16, 21), exact = 0, near = 0
		for (let { drawbars, freq } of regs) {
			let r = fitTonewheel(fx(tonewheel(freq, { drawbars, duration: 1.5 })), { freq })
			if (r.drawbars === drawbars) exact++
			if ([...r.drawbars].every((d, k) => Math.abs(d - drawbars[k]) <= 1)) near++
		}
		ok(near >= floor * regs.length, `${name}: ${exact}/${regs.length} exact, ${near}/${regs.length} within ±1 per drawbar`)
	}
})

// --- modal snapshot from audio (synth-modal-fit): differential against synth-modal's own renders ---

import { fitModal } from './index.js'

// each mode as synth-modal plays it: Hz, amplitude amp·gain (gains divided by Σ|gain| past 1), t60
const playedModes = ({ freq, amp = 0.8, modes }) => {
	let sum = modes.reduce((a, m) => a + Math.abs(m.gain), 0), norm = sum > 1 ? sum : 1
	return modes.map(m => ({ f: freq * m.ratio, A: amp * m.gain / norm, t60: m.t60 }))
}
// worst error of the fitted mode nearest each true one; the count of fitted modes
function modalErrors (truth, snap) {
	let got = playedModes(snap), e = { n: got.length, cents: 0, t60: 0, dB: 0, signs: true }
	for (let t of truth) {
		let g = got.reduce((b, m) => Math.abs(m.f - t.f) < Math.abs(b.f - t.f) ? m : b)
		e.cents = Math.max(e.cents, Math.abs(1200 * Math.log2(g.f / t.f)))
		e.t60 = Math.max(e.t60, Math.abs(g.t60 / t.t60 - 1))
		e.dB = Math.max(e.dB, Math.abs(20 * Math.log10(g.A / t.A)))
		e.signs &&= Math.sign(g.A) === Math.sign(t.A)
	}
	return e
}
const exact = (e, label) => ok(e.cents < 1e-3 && e.t60 < 1e-3 && e.dB < 0.01 && e.signs,
	`${label}: ${e.n} modes, worst ${e.cents.toExponential(1)} cents, t60 ${(100 * e.t60).toExponential(1)}%, ${e.dB.toExponential(1)} dB, signs ${e.signs}`)

test('modal-fit: custom modes come back from their render: frequency, t60, amplitude, sign', () => {
	let modes = [{ ratio: 1, gain: 1, t60: 1.5 }, { ratio: 2.71, gain: 0.5, t60: 0.6 }, { ratio: 2.73, gain: -0.3, t60: 2 }, { ratio: 5.4, gain: 0.2, t60: 0.2 }]
	let s = fitModal(modal(330, { modes, duration: 1.5 }))
	is(s.modes.length, 4, 'four modes, the 6.6 Hz pair resolved')
	exact(modalErrors(playedModes({ freq: 330, modes }), s), 'inharmonic, a pair 6.6 Hz apart')
	almost(s.freq, 330, 1e-4, 'ratio 1 on the mode carrying the most energy')
})

test('modal-fit: a named model inverts: free-free bar, strike 0.7 (negative gains), HF damping', () => {
	// synth-modal's bar: fk/f1 = (λk/λ1)², λ = 4.7300, 7.8532, 10.9956, 14.1372 (Fletcher & Rossing,
	// The Physics of Musical Instruments, 2nd ed., ch. 2); gain sin(kπ·strike)/k over Σ|gain|;
	// t60_k = t60·(f1/fk)^damping
	let lambda = [4.7300, 7.8532, 10.9956, 14.1372], strike = 0.7, t60 = 1.5, damping = 0.5
	let ratios = lambda.map(l => (l / lambda[0]) ** 2), gains = ratios.map((r, i) => Math.sin((i + 1) * Math.PI * strike) / (i + 1))
	let sum = gains.reduce((a, g) => a + Math.abs(g), 0)
	let truth = ratios.map((r, i) => ({ f: 220 * r, A: 0.8 * gains[i] / sum, t60: t60 * r ** -damping }))
	let s = fitModal(modal(220, { model: 'bar', nmodes: 4, strike, t60, damping, duration: 2 }))
	is(s.modes.length, 4, 'four modes, 220 Hz on a band edge included')
	exact(modalErrors(truth, s), 'bar, two gains negative')
})

test('modal-fit: modes closer than an FFT bin: pairs split by 1, 2 and 5 Hz', () => {
	let modes = [{ ratio: 1, gain: 1, t60: 3 }, { ratio: 1.001, gain: -0.7, t60: 2.5 }, { ratio: 3, gain: 0.5, t60: 2 }, { ratio: 3.002, gain: 0.4, t60: 4 }, { ratio: 6, gain: 0.3, t60: 2 }, { ratio: 6.005, gain: -0.3, t60: 2.2 }]
	let s = fitModal(modal(1000, { modes, duration: 3 }))
	is(s.modes.length, 6, 'six modes')
	exact(modalErrors(playedModes({ freq: 1000, modes }), s), 'pairs at 1000, 3000, 6000 Hz')
})

test('modal-fit: the snapshot plays the strike back: modal(s.freq, s) matches the render sample for sample', () => {
	let x = modal(180, { model: 'membrane', nmodes: 8, t60: 1.2, duration: 1 })
	let s = fitModal(x), y = modal(s.freq, { ...s, duration: 1 }), err = 0
	for (let i = 0; i < x.length; i++) err = Math.max(err, Math.abs(x[i] - y[i]))
	ok(err < 1e-4 * peakOf(x), `worst sample ${(20 * Math.log10(err / peakOf(x))).toFixed(0)} dB under the peak`)
})

test('modal-fit: white noise 40 dB under the attack: within 0.1 cents, 1% of t60, 0.2 dB', () => {
	let rnd = ((s) => () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32)(3)
	let modes = [{ ratio: 1, gain: 1, t60: 2 }, { ratio: 2.7565, gain: -0.6, t60: 1 }, { ratio: 5.4039, gain: 0.45, t60: 0.6 }, { ratio: 8.9330, gain: 0.35, t60: 0.4 }]
	let x = modal(300, { modes, duration: 2 }), level = Math.sqrt(x.subarray(0, 2205).reduce((a, v) => a + v * v, 0) / 2205) / 100
	let noisy = Float64Array.from(x, v => v + level * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())) // Box–Muller
	let e = modalErrors(playedModes({ freq: 300, modes }), fitModal(noisy))
	ok(e.n === 4 && e.cents < 0.1 && e.t60 < 0.01 && e.dB < 0.2 && e.signs, `${e.n} modes, worst ${e.cents.toFixed(4)} cents, t60 ${(100 * e.t60).toFixed(2)}%, ${e.dB.toFixed(3)} dB`)
})

test('modal-fit: onset after silence, channels, JSON, freq and nmodes options, silent input', () => {
	let x = modal(250, { modes: [{ ratio: 1, gain: 1, t60: 1 }, { ratio: 2.3, gain: 0.4, t60: 0.5 }, { ratio: 3.9, gain: 0.2, t60: 0.3 }], duration: 1 })
	let s = fitModal(x), late = new Float32Array(x.length + 2000)
	late.set(x, 2000)
	is(fitModal(late), s, '2000 samples of silence before the strike change nothing')
	is(fitModal([x, x]), s, 'two equal channels give the mono snapshot')
	is(JSON.parse(JSON.stringify(s)), s, 'plain JSON: { freq, amp, modes: [{ ratio, gain, t60 }] }')
	let f = fitModal(x, { freq: 125 })
	almost(f.modes[0].ratio, 2, 1e-6, 'freq: ratios over the given Hz')
	is(fitModal(x, { nmodes: 2 }).modes.length, 2, 'nmodes keeps the strongest')
	throws(() => fitModal(new Float32Array(4410)), /silent/)
})

// The family's manifests: audio.js names every member that has a manifest (a package of packages/ the umbrella depends
// on, with an audio.js), and no other; each name a member's manifest exports is the entry's, the same binding
test('audio.js lists every member that has a manifest', async () => {
	const { readdirSync, existsSync, readFileSync } = await import('node:fs')
	const at = p => new URL(p, import.meta.url), { dependencies } = JSON.parse(readFileSync(at('package.json'), 'utf8'))
	const members = readdirSync(at('packages')).filter(d => existsSync(at(`packages/${d}/audio.js`)))
		.map(d => JSON.parse(readFileSync(at(`packages/${d}/package.json`), 'utf8')).name).filter(n => n in dependencies).sort()
	const listed = [...readFileSync(at('audio.js'), 'utf8').matchAll(/^export \* from '(@audio\/[^']+)\/audio'$/gm)].map(m => m[1]).sort()
	is(listed, members, 'one line per member, no other')
	const family = await import(at('audio.js')), missing = []
	for (const m of members) for (const [k, v] of Object.entries(await import(`${m}/audio`))) if (k !== 'default' && family[k] !== v) missing.push(`${m}: ${k}`)
	is(missing, [], 'every name a member\'s manifest exports, the same binding')
})

const { failed } = await test.run()
process.exit(failed.length ? 1 : 0)
