// The live instrument (audio.js) against the kernel (dx7.js) that the family's test.js proves bit-exact with upstream
// MSFA: a note through the manifest is the kernel's own render of it, sample for sample, at any frame and call size.
import test, { ok, is } from 'tst'
// tst starts a file's tests once their count has stood for 10 ms, and gives up on a file that has registered none
// within 200 ms, which the top-level await below can outlast: the file starts them itself, after the last is registered
test.manual = true
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { dx7 as manifest } from './audio.js'
import { Voice, INIT, MAX, parse } from './dx7.js'
import { PARAMS } from './sysex.js'

const SCALE = 2 ** -28 // dx7()'s output scale
const MSFA = join(homedir(), '.cache/audiojs/data/msfa')
const msfa = await import('../../test/msfa.js').then(m => m.reference(), () => null) // the family's upstream build; null where it cannot run

// the family's random voices: each sounding byte uniform over 0..MAX, by the LCG the family's test.js draws them with
const lcg = (seed) => (n) => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % (n + 1) }
const random = (rnd) => { let p = new Uint8Array(155); for (let i = 0; i < 145; i++) p[i] = rnd(MAX[i]); return p }

// a patch as the manifest's parameter values: a byte plus its display shift, an enum by name, a switch as a boolean
const values = (patch) => Object.fromEntries(PARAMS.map(([name, r, shift], i) => [name,
	typeof r === 'number' ? new Float32Array([patch[i] + shift]) : manifest.params[name].type === 'bool' ? patch[i] === 1 : r[patch[i]]]))

// notes [{ on, off?, midi, velocity, id }] as a host gives them (CONTRACT.md § Events): sorted by frame, at one frame an
// off before an on unless it ends a note begun there
function slots (notes) {
	let evs = []
	for (let n of notes) {
		evs.push({ time: n.on, kind: 'on', midi: n.midi, velocity: n.velocity ?? 1, id: n.id, at: n.on })
		if (n.off != null) evs.push({ time: n.off, kind: 'off', midi: n.midi, velocity: 0, id: n.id, at: n.on })
	}
	let rank = e => e.kind === 'on' ? 1 : e.at < e.time ? 0 : 2
	return evs.sort((a, b) => a.time - b.time || rank(a) - rank(b))
}

// the manifest as a host runs it: one instance, calls of `block` frames, each given its notes' slots; `change(f)` gives
// the parameter values from frame f on, where one changes between calls
function play (notes, { frames, block = 128, fs = 44100, patch = INIT, change } = {}) {
	let params = values(patch), ctx = { sampleRate: fs, maxBlockSize: block, maxChannels: 1, params, events: [] }
	let proc = manifest(ctx), out = new Float32Array(frames), evs = slots(notes)
	for (let f = 0; f < frames; f += block) {
		let n = Math.min(block, frames - f)
		ctx.events = evs.filter(e => e.time >= f && e.time < f + n).map(({ time, kind, midi, velocity, id }) => ({ time: time - f, kind, midi, velocity, id }))
		proc([], [[out.subarray(f, f + n)]], change?.(f) ?? params)
	}
	return out
}

// the kernel's direct render of one note, added into `sum` (int32 engine samples): a new Voice from frame `on`, 64-sample
// blocks, its key up before the first block that starts at or after `off`, nothing from frame `cut` on (a voice taken)
function note (sum, patch, { on, off = Infinity, cut = Infinity, midi, velocity = 1, fs = 44100 }) {
	let v = new Voice(patch, { note: midi + patch[144] - 24, velocity: Math.round(velocity * 127), fs }), blk = new Int32Array(64)
	let end = Math.min(sum.length, cut), up = Math.ceil((off - on) / 64)
	for (let b = 0; on + b * 64 < end; b++) {
		if (b === up) v.keyup()
		blk.fill(0); v.block(blk)
		for (let i = 0; i < 64 && on + b * 64 + i < end; i++) sum[on + b * 64 + i] += blk[i]
	}
	return sum
}
const kernel = (frames, list) => { let sum = new Float64Array(frames); for (let [patch, o] of list) note(sum, patch, o); return Float32Array.from(sum, x => x * SCALE) }
const differ = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) d++; return d }
const peak = (d, from = 0, to = d.length) => { let m = 0; for (let i = from; i < to; i++) m = Math.max(m, Math.abs(d[i])); return m }

// the voices the family's MSFA tests render, with their notes, velocities, lengths and rates
function family () {
	let list = []
	for (let alg = 0; alg < 32; alg++) {
		let p = Uint8Array.from(INIT)
		for (let op = 0; op < 6; op++) p.set([99, 60 + 5 * op, 40, 70, 99, 90 - 7 * op, 70, 0, 39, 0, 0, 0, 0, 0, 0, 0, 72 + 5 * op, 0, op + 1, 7 * op, 6 + op % 3], op * 21)
		p[134] = alg; p[135] = alg % 8
		list.push({ what: `algorithm ${alg + 1}, feedback ${alg % 8}`, patch: p, note: 48 + alg % 24, velocity: 100, fs: 44100, duration: 0.3, release: 0.2 })
	}
	let rnd = lcg(7)
	for (let i = 0; i < 24; i++) {
		let p = random(rnd), fs = [44100, 48000, 49096][i % 3], n = 24 + rnd(84), velocity = 1 + rnd(126)
		list.push({ what: `random voice ${i}`, patch: p, note: n, velocity, fs, duration: 0.3, release: 0.2 })
	}
	rnd = lcg(11)
	for (let wave = 0; wave < 6; wave++) for (let sync = 0; sync < 2; sync++) {
		let p = random(rnd)
		p.set([20 + rnd(79), sync ? rnd(99) : 0, 50 + rnd(49), 0, sync, wave, 4 + rnd(3)], 137)
		for (let op = 1; op < 6; op += 2) { p[op * 21 + 17] = 1; p[op * 21 + 20] = rnd(14) }
		list.push({ what: `LFO wave ${wave}, sync ${sync}, fixed operators`, patch: p, note: 36 + rnd(48), velocity: 1 + rnd(126), fs: 44100, duration: 0.8, release: 0.3 })
	}
	let rom = join(MSFA, 'app/src/main/res/raw/rom1a.syx') // Yamaha's voices as MSFA bundles them; not redistributed here
	if (existsSync(rom)) parse(readFileSync(rom)).forEach(({ name, patch }, i) =>
		list.push({ what: name, patch, note: 48 + i % 3 * 12, velocity: 64 + i, fs: 44100, duration: 0.5, release: 0.5 }))
	return list
}
// one family voice through the manifest, from frame 37 of its first call: the engine plays the family's note
const ON = 37
function one ({ patch, note: n, velocity, fs, duration, release }, block = 128) {
	let frames = ON + Math.round((duration + release) * fs), off = ON + Math.round(duration * fs), midi = n - patch[144] + 24
	return { frames, off, midi, out: play([{ on: ON, off, midi, velocity: velocity / 127, id: 0 }], { frames, fs, patch, block }) }
}

test('dx7.js: a Voice reused by init() sounds as a new one, bit for bit', { timeout: 60000 }, () => {
	let rnd = lcg(3), x = new Int32Array(64), y = new Int32Array(64)
	for (let i = 0; i < 24; i++) {
		let fs = [44100, 48000, 49096][i % 3], a = random(rnd), b = random(rnd), n = 24 + rnd(80) + (i % 4 ? 0 : 0.37), vel = rnd(127)
		let used = new Voice(a, { note: 24 + rnd(80), velocity: rnd(127), fs })
		for (let k = 0; k < 200; k++) { if (k === 120) used.keyup(); x.fill(0); used.block(x) }
		used.init(b, n, vel)
		let fresh = new Voice(b, { note: n, velocity: vel, fs }), d = 0
		for (let k = 0; k < 300; k++) {
			if (k === 200) { used.keyup(); fresh.keyup() }
			x.fill(0); y.fill(0); used.block(x); fresh.block(y)
			for (let j = 0; j < 64; j++) if (x[j] !== y[j]) d++
		}
		ok(!d, `voice ${i}, ${fs} Hz, note ${n}: ${d} of ${300 * 64} samples differ`)
	}
})

test('manifest: 145 parameters, the VCED voice byte by byte in its order; ranges are the bytes\', defaults INIT VOICE', () => {
	let names = Object.keys(manifest.params)
	is(names.length, 145)
	is(names, PARAMS.map(p => p[0]), 'declaration order: the patch\'s')
	is([names[0], names[16], names[20], names[21], names[125], names[126], names[134], names[136], names[142], names[144]],
		['op6Rate1', 'op6OutputLevel', 'op6Detune', 'op5Rate1', 'op1Detune', 'pitchRate1', 'algorithm', 'oscKeySync', 'lfoWave', 'transpose'])
	names.forEach((k, i) => {
		let s = manifest.params[k]
		if (s.type === 'number') ok(s.step === 1 && s.max - s.min === MAX[i] && s.default - s.min === INIT[i], `${k}: ${s.min}..${s.max} step 1, default ${s.default}`)
		else if (s.type === 'enum') ok(s.values.length - 1 === MAX[i] && s.values.indexOf(s.default) === INIT[i], `${k}: ${s.values.join(' ')}, default ${s.default}`)
		else ok(s.type === 'bool' && MAX[i] === 1 && s.default === (INIT[i] === 1), `${k}: switch, default ${s.default}`)
	})
	// the DX7's voice initialize (Operating Manual): algorithm 1, OP1 alone at output level 99, every EG 99 99 99 99 / 99 99 99 0,
	// ratio 1.00, no detune, the pitch EG flat at 50, LFO speed 35 triangle with key sync, P MOD SENS 3, transpose C3
	let d = Object.fromEntries(names.map(k => [k, manifest.params[k].default]))
	is([d.algorithm, d.op1OutputLevel, d.op2OutputLevel, d.op6OutputLevel, d.op3Rate4, d.op3Level3, d.op3Level4, d.op4Mode, d.op4Coarse, d.op4Detune],
		[1, 99, 0, 0, 99, 99, 0, 'ratio', 1, 0])
	is([d.pitchLevel1, d.pitchLevel4, d.lfoSpeed, d.lfoWave, d.lfoKeySync, d.oscKeySync, d.pitchModSens, d.transpose, d.op1LeftCurve],
		[50, 50, 35, 'triangle', true, true, 3, 0, '-lin'])
	is(manifest.params.transpose.unit, 'st')
})

test('manifest: a note is the kernel\'s direct render of it, bit for bit: the family\'s MSFA voices', { timeout: 120000 }, () => {
	family().forEach((v, i) => {
		let { frames, off, midi, out } = one(v)
		let want = kernel(frames, [[v.patch, { on: ON, off, midi, velocity: v.velocity / 127, fs: v.fs }]])
		let d = differ(out, want), p = peak(want)
		// the algorithm voices all sound; a random voice may be silent (no carrier above the engine's threshold)
		ok(!d && (i >= 32 || p > 2 ** -8), `${v.what}, note ${v.note}, velocity ${v.velocity}, ${v.fs} Hz: ${d} of ${frames} differ, peak ${p.toFixed(4)}`)
	})
})

test('manifest: at 49096 Hz a note is upstream MSFA\'s, bit for bit (the kernel\'s EG timing is upstream\'s there)', { skip: !msfa, timeout: 120000 }, () => {
	for (let v of family()) {
		v = { ...v, fs: 49096 }
		let { frames, off, out } = one(v)
		let up = msfa.note(v.patch, { note: v.note, velocity: v.velocity, fs: v.fs, blocks: Math.ceil((frames - ON) / 64), keyup: Math.ceil((off - ON) / 64) })
		let d = 0
		for (let i = 0; i < frames; i++) if (!Object.is(out[i], i < ON ? 0 : Math.fround(up[i - ON] * SCALE))) d++
		ok(!d, `${v.what}, note ${v.note}, velocity ${v.velocity}: ${d} of ${frames} differ from MSFA`)
	}
})

test('manifest: calls of 1, 64, 127, 128 and 1024 frames render what one whole call does', { timeout: 60000 }, () => {
	let p = family()[9].patch, frames = 30000, notes = [
		{ on: 0, off: 9000, midi: 60, id: 0 }, { on: 0, off: 4000, midi: 64, velocity: 0.6, id: 1 }, { on: 127, off: 12345, midi: 67, velocity: 0.3, id: 2 },
		{ on: 4000, off: 4000, midi: 72, id: 3 }, { on: 4000, off: 20000, midi: 48.25, id: 4 }, { on: 9000, midi: 55, id: 5 },
		{ on: 16383, off: 16384, midi: 79, velocity: 0, id: 6 }, { on: 20000, off: 27000, midi: 84, id: 7 },
	]
	let whole = play(notes, { frames, patch: p, block: frames })
	ok(peak(whole, 25000) > 0, 'the score sounds to its end')
	for (let block of [1, 64, 127, 128, 1024]) is(differ(play(notes, { frames, patch: p, block }), whole), 0, `calls of ${block}: none of ${frames} frames differ`)
})

test('manifest: a note-on at frame 37 starts at frame 37; latency 0: the INIT sine starts from zero phase there', () => {
	let out = play([{ on: ON, off: 4000, midi: 69, id: 0 }], { frames: 8192 })
	is(differ(out, kernel(8192, [[INIT, { on: ON, off: 4000, midi: 69 }]])), 0, 'the kernel\'s note from frame 37')
	ok(peak(out, 0, ON + 1) === 0 && out[ON + 1] > 0, `nothing up to frame 37 (the note's first sample, sin 0), ${out[ON + 1]} at 38`)
	// the phase of a least-squares a·sin ωk + b·cos ωk, k from frame 37, in two windows after the attack's block; the line
	// through them, back at k = 0, is the onset's phase (the engine's 440 Hz is off by a few millionths, a slope)
	let w = 2 * Math.PI * 440 / 44100
	const phase = (k0, len) => {
		let ss = 0, cc = 0, sc = 0, ys = 0, yc = 0
		for (let k = k0; k < k0 + len; k++) { let s = Math.sin(w * k), c = Math.cos(w * k), y = out[ON + k]; ss += s * s; cc += c * c; sc += s * c; ys += y * s; yc += y * c }
		return Math.atan2(yc * ss - ys * sc, ys * cc - yc * sc)
	}
	let p1 = phase(64, 1024), p2 = phase(2560, 1024), lag = -(p1 - (p2 - p1) * 576 / (3072 - 576)) / w
	ok(Math.abs(lag) < 0.01 && manifest.latency === undefined, `onset at frame 37 ${lag >= 0 ? '+' : ''}${lag.toFixed(4)}: latency 0 (declared none)`)
})

test('manifest: velocity 0..1 reaches the engine as MIDI velocity round(v·127); a fractional midi plays between keys', () => {
	let p = Uint8Array.from(INIT); p[5 * 21 + 15] = 7 // OP1 velocity sensitivity 7
	let half = play([{ on: 0, midi: 69, velocity: 0.5, id: 0 }], { frames: 4096, patch: p })
	is(differ(half, kernel(4096, [[p, { on: 0, midi: 69, velocity: 64 / 127 }]])), 0, '0.5 plays as 64 (63.5 rounds up)')
	ok(differ(half, kernel(4096, [[p, { on: 0, midi: 69, velocity: 63 / 127 }]])) > 0, 'not as 63')
	let q = play([{ on: 0, midi: 60.5, id: 0 }], { frames: 44100 })
	is(differ(q, kernel(44100, [[INIT, { on: 0, midi: 60.5 }]])), 0, 'the kernel\'s note 60.5')
	let up = 0, first = -1, last = -1
	for (let i = 2205; i < 44100; i++) if (q[i - 1] <= 0 && q[i] > 0) { if (first < 0) first = i; last = i; up++ }
	let hz = (up - 1) * 44100 / (last - first), want = 440 * 2 ** ((60.5 - 69) / 12)
	ok(Math.abs(hz - want) < 0.1, `${hz.toFixed(3)} Hz, a quarter tone above C4: ${want.toFixed(3)}`)
})

test('manifest: a 17th note takes a voice: the next whose key is up (MSFA), else the oldest held note\'s', { timeout: 60000 }, () => {
	let p = Uint8Array.from(INIT); p[5 * 21 + 3] = 40 // OP1 release rate 40: a release still ringing when its voice is taken
	let frames = 8000, held = Array.from({ length: 16 }, (_, k) => ({ on: 100 * k, midi: 48 + k, id: k }))
	// every key held: the oldest (id 0) gives way at 3000
	let all = play([...held, { on: 3000, midi: 72, id: 16 }], { frames, patch: p })
	is(differ(all, kernel(frames, [...held.map(n => [p, { ...n, cut: n.id === 0 ? 3000 : Infinity }]), [p, { on: 3000, midi: 72 }]])), 0, 'id 0 cut at 3000, the other 16 sound')
	// ids 3 and 9 released at 2000: from the voice after the last taken (voice 0, after 15), the first with its key up is id 3's
	let rel = held.map(n => n.id === 3 || n.id === 9 ? { ...n, off: 2000 } : n), out = play([...rel, { on: 3000, midi: 72, id: 16 }], { frames, patch: p })
	let want = (cut) => kernel(frames, [...rel.map(n => [p, { ...n, cut: n.id === cut ? 3000 : Infinity }]), [p, { on: 3000, midi: 72 }]])
	is(differ(out, want(3)), 0, 'id 3\'s release cut at 3000, id 9\'s rings on')
	ok(differ(out, want(9)) > 0 && differ(out, want(0)) > 0, 'not id 9\'s voice, not the oldest held note\'s')
})

test('manifest: a chord\'s offs each release their own note', () => {
	let p = Uint8Array.from(INIT); p[5 * 21 + 3] = 45
	let frames = 20000, chord = [{ on: 50, off: 6000, midi: 60, id: 0 }, { on: 50, off: 3000, midi: 64, id: 1 }, { on: 50, off: 9000, midi: 67, id: 2 }]
	let out = play(chord, { frames, patch: p })
	is(differ(out, kernel(frames, chord.map(n => [p, n]))), 0, 'each note released at its own off')
	let swapped = chord.map((n, i) => ({ ...n, off: chord[(i + 1) % 3].off }))
	ok(differ(out, kernel(frames, swapped.map(n => [p, n]))) > 0, 'not at another note\'s')
	// one key struck twice, the second note released first: an off ends the note of its id, not the first of its key
	let twice = [{ on: 50, off: 9000, midi: 60, id: 0 }, { on: 1000, off: 3000, midi: 60, id: 1 }]
	is(differ(play(twice, { frames, patch: p }), kernel(frames, twice.map(n => [p, n]))), 0, 'one key twice: each off releases the note of its id')
})

test('manifest: every output channel carries the voice', () => {
	let ctx = { sampleRate: 44100, maxBlockSize: 256, maxChannels: 3, params: values(INIT), events: [{ time: 5, kind: 'on', midi: 60, velocity: 1, id: 0 }] }
	let y = [new Float32Array(256), new Float32Array(256), new Float32Array(256)]
	manifest(ctx)([], [y], ctx.params)
	ok(peak(y[0]) > 0 && !differ(y[0], y[1]) && !differ(y[0], y[2]), `3 channels, each the note, peak ${peak(y[0]).toFixed(3)}`)
})

test('manifest: after the last envelope ends the output is exactly 0 and stays 0, within the declared tail', { timeout: 60000 }, () => {
	const tail = (patch, fs = 44100) => manifest.tail({ sampleRate: fs, params: values(patch) })
	let frames = 44100, out = play([{ on: 0, off: 5000, midi: 69, id: 0 }], { frames }), last = 0
	for (let i = 0; i < frames; i++) if (out[i] !== 0) last = i
	let T = tail(INIT) * 44100
	ok(last > 5000 && last - 5000 <= T && last - 5000 > T - 128, `INIT: last sound ${last - 5000} frames after the off, tail ${T.toFixed(0)}`)
	ok(peak(out, last + 1) === 0, `exactly 0 for the ${frames - last - 1} frames after`)
	// random voices with every L4 at 0 and release rates of 50 or more: each note's last sound is within the tail
	let rnd = lcg(13)
	for (let i = 0; i < 12; i++) {
		let p = random(rnd)
		for (let op = 0; op < 6; op++) { p[op * 21 + 7] = 0; p[op * 21 + 3] = 50 + rnd(49); p[op * 21 + 16] = 80 + rnd(19) }
		let T = tail(p), off = 3000 + rnd(64), f = off + Math.ceil(T * 44100) + 4096, end = 0
		let d = play([{ on: 1, off, midi: 30 + rnd(60), velocity: (64 + rnd(63)) / 127, id: 0 }], { frames: f, patch: p })
		for (let j = 0; j < f; j++) if (d[j] !== 0) end = j
		ok(end > off && end - off <= T * 44100 && peak(d, off + Math.ceil(T * 44100)) === 0, `random voice ${i}: last sound ${end - off} frames after the off, tail ${(T * 44100).toFixed(0)}`)
	}
	// the longest release at the keyboard's end: OP1's +lin left depth raises low keys, and with transpose C1 midi 0 is
	// key -24; the tail is that note's
	let low = Uint8Array.from(INIT); low.set([60, 20, 0, 3], 5 * 21 + 8); low[5 * 21 + 3] = 65; low[5 * 21 + 16] = 40; low[144] = 0
	let lo = play([{ on: 0, off: 1000, midi: 0, id: 0 }], { frames: 20000, patch: low }), TL = tail(low) * 44100, lend = 0
	for (let j = 0; j < 20000; j++) if (lo[j] !== 0) lend = j
	ok(lend - 1000 <= TL && lend - 1000 > TL - 128, `midi 0, transpose C1: last sound ${lend - 1000} frames after the off, tail ${TL.toFixed(0)}`)
	// a carrier whose final level holds: the release never ends, and the tail says so
	let drone = Uint8Array.from(INIT); drone[5 * 21 + 7] = 99
	let dd = play([{ on: 0, off: 2000, midi: 69, id: 0 }], { frames: 44100, patch: drone })
	ok(tail(drone) === Infinity && peak(dd, 40000) > 0.1, `OP1 level 4 at 99: tail Infinity, still ${peak(dd, 40000).toFixed(3)} 0.9 s after the off`)
})

test('manifest: a value changed while a note sounds applies from the next note on, for each of the 145 (the engine reads them as a note starts)', { timeout: 60000 }, () => {
	// six carriers (algorithm 32) whose EG segments, pitch EG and LFO all move within the note; the key right of three
	// operators' break points, left of the others'
	let base = Uint8Array.from(INIT)
	for (let k = 0; k < 6; k++) base.set([80, 70 + k, 65 + k, 70, 99, 85, 70, 0, k % 2 ? 70 : 20, 40, 40, k % 4, (k + 1) % 4, 3, 0, 4, 90 - 2 * k, 0, 1 + k, 10 * k, 6 + k % 3], k * 21)
	base.set([95, 95, 95, 95, 56, 46, 54, 50, 31, 5, 1, 40, 0, 40, 0, 1, 0, 3, 24], 126)
	let frames = 8000, notes = [{ on: 10, off: 5000, midi: 60, velocity: 80 / 127, id: 0 }, { on: 2048, off: 5000, midi: 67, id: 1 }]
	let late = 0, heard = 0
	PARAMS.forEach(([name], i) => {
		let p = Uint8Array.from(base); p[i] = (p[i] + Math.ceil((MAX[i] + 1) / 2)) % (MAX[i] + 1) // half the range away
		let before = values(base), after = values(p)
		let out = play(notes, { frames, patch: base, change: f => f >= 1024 ? after : before })
		let want = kernel(frames, [[base, notes[0]], [p, notes[1]]])
		if (differ(out, want)) late++
		if (differ(want, kernel(frames, [[p, notes[0]], [p, notes[1]]]))) heard++
	})
	ok(!late, `${145 - late} of 145: the sounding note keeps its values, the next takes the new one`)
	// unheard: the 8 bytes the engine does not model (AMS of each operator, LFO AMD, OSC KEY SYNC) and the scaling of the
	// break point's other side
	ok(heard >= 120, `${heard} of the 145 changes alter the first note when it starts with them, so the check sees them`)
})

const { failed } = await test.run()
process.exit(failed.length ? 1 : 0)
