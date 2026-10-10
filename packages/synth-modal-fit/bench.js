// Bench for @audio/synth-modal-fit, frozen 2026-10-10 before the fit was tuned against it: change
// the fit, not this file. Run from the family root:
//   node packages/synth-modal-fit/bench.js [synthetic [n] | floors | recordings | all]
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

async function strikes () {
	let by = new Map()
	for (let src of SOURCES) {
		let x = await load(src)
		if (!by.has(src.instrument)) by.set(src.instrument, [])
		by.get(src.instrument).push(...cut(x).map(s => ({ s, src })))
	}
	for (let [name, list] of by) {
		let peak = (s) => s.reduce((m, v) => Math.max(m, Math.abs(v)), 0), top = Math.max(...list.map(({ s }) => peak(s)))
		by.set(name, list.filter(({ s }) => peak(s) >= top * 10 ** (-30 / 20) && s.filter(v => Math.abs(v) >= 0.99).length <= 100).slice(0, 24))
	}
	return by
}

function floors (list) {
	return list.map((a, i) => Math.min(...list.filter((_, j) => j !== i).map(b => D(a.s, b.s))))
}

async function recordings (scoreFit) {
	let by = await strikes()
	console.log(`Recordings: strikes, floor = D to the nearest other strike, threshold T = median floor${scoreFit ? '; R = D to the re-render, R1 = the strongest mode alone' : ''}`)
	console.log(`instrument      strikes | T (floor) floor range    ${scoreFit ? '| R median  R range        pass  | R1 median | modes | cpu ms | verdict' : ''}`)
	let out = []
	for (let [name, list] of by) {
		// one strike has no floor: its re-render is reported without a verdict
		let fl = list.length > 1 ? floors(list) : [], T = fl.length ? median(fl) : NaN
		let line = `${name.padEnd(15)} ${String(list.length).padStart(7)} | ${(fl.length ? T.toFixed(3) : '–').padStart(9)} ${(fl.length ? `${Math.min(...fl).toFixed(3)}–${Math.max(...fl).toFixed(3)}` : '').padStart(13)}   `
		let row = { name, strikes: list.length, T, floors: fl }
		if (scoreFit) {
			let R = [], R1 = [], modes = [], ms = []
			for (let { s } of list) {
				let [r, t] = cpu(() => { try { return fit(s, { fs }) } catch (e) { return null } })
				ms.push(t); modes.push(r?.modes.length ?? 0)
				if (!r) { R.push(Infinity); R1.push(Infinity); continue }
				R.push(D(s, modal(r.freq, { ...r, fs, duration: s.length / fs })))
				let ref = r.modes.find(m => m.ratio === 1) ?? r.modes[0], sum = r.modes.reduce((a, m) => a + Math.abs(m.gain), 0)
				R1.push(D(s, modal(r.freq, { modes: [ref], amp: r.amp * Math.abs(ref.gain) / sum, fs, duration: s.length / fs })))
			}
			let pass = R.filter((v, i) => v < fl[i]).length, ok = fl.length ? median(R) < T : null
			Object.assign(row, { R, R1, pass, modes: median(modes), ms: median(ms), ok })
			line += `| ${median(R).toFixed(3).padStart(8)} ${`${Math.min(...R).toFixed(3)}–${Math.max(...R).toFixed(3)}`.padStart(13)}  ${(fl.length ? `${pass}/${list.length}` : '–').padStart(5)} | ${median(R1).toFixed(3).padStart(9)} | ${String(median(modes)).padStart(5)} | ${median(ms).toFixed(0).padStart(6)} | ${ok == null ? '–' : ok ? 'pass' : 'FAIL'}`
		}
		console.log(line)
		out.push(row)
	}
	console.log('\nSources:')
	for (let s of SOURCES) console.log(`  ${s.instrument}: "${s.title}" by ${s.author}, ${s.license}, ${s.page}`)
	return out
}

if (part === 'synthetic' || part === 'all') synthetic(Number(count))
if (part === 'floors') await recordings(false)
if (part === 'recordings' || part === 'all') await recordings(true)
