// DX7 FM engine: a JavaScript port of the core of Music Synthesizer for Android (MSFA),
// Raph Levien, https://github.com/google/music-synthesizer-for-android (commit f67d41d).
//
// Copyright 2012-2013 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
// except in compliance with the License. You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific language governing permissions
// and limitations under the License.
//
// Changes, 2026, audiojs: translated to JavaScript from app/src/main/jni/{sin,exp2,freqlut,
// env,pitchenv,lfo,fm_op_kernel,fm_core,dx7note}.cc (the portable fixed-point path, not the
// AArch64 NEON float kernel); int64 products computed exactly in double precision; LFO phase,
// sample-and-hold state and feedback history start at 0 (upstream leaves them uninitialized);
// libm-derived constants pinned as literals; amplitude-EG steps scaled to the DX7's own sample
// clock (49096 Hz) unless { msfa: true }; the dx7() wrapper applies the voice's transpose.

const LG_N = 6, N = 1 << LG_N // MSFA renders in blocks of 64 samples (synth.h)
const DX7_FS = 49096 // DX7 sample rate, MSFA wiki/Dx7Hardware.wiki

// 2^(1/1024) as the IEEE double libm returns for exp2(1.0/1024) and pow(2, 1.0/1024)
// (exp2.cc, freqlut.cc); pinned so every JS engine builds identical tables.
const INC = 1.0006771306930664

// sin.cc: 1024-point sine, Q24, stored as [delta, value] pairs (SIN_DELTA), built by the
// rotation recurrence of Sin::init. c, s = floor(cos|sin(2π/1024)·2^30 + 0.5).
const SIN = new Int32Array(2048)
{
	const c = 1073721611n, s = 6588356n, R = 1n << 29n
	let u = 1n << 30n, v = 0n
	for (let i = 0; i < 512; i++) {
		let y = Number((v + 32n) >> 6n)
		SIN[(i << 1) + 1] = y
		SIN[((i + 512) << 1) + 1] = -y
		let t = (u * s + v * c + R) >> 30n
		u = (u * c - v * s + R) >> 30n
		v = t
	}
	for (let i = 0; i < 1023; i++) SIN[i << 1] = SIN[(i << 1) + 3] - SIN[(i << 1) + 1]
	SIN[2046] = -SIN[2047]
}

// Sin::lookup: phase Q24 (1.0 = one cycle) → sine Q24. |delta·lowbits| < 2^31, so the
// product is exact in int32 range.
const sin = (phase) => {
	let i = (phase >> 13) & 0x7fe
	return SIN[i + 1] + ((SIN[i] * (phase & 0x3fff)) >> 14)
}

// exp2.cc: 2^x table, Q30, [delta, value] pairs.
const EXP2 = new Int32Array(2048)
{
	let y = 2 ** 30
	for (let i = 0; i < 1024; i++) { EXP2[(i << 1) + 1] = Math.floor(y + 0.5); y *= INC }
	for (let i = 0; i < 1023; i++) EXP2[i << 1] = EXP2[(i << 1) + 3] - EXP2[(i << 1) + 1]
	EXP2[2046] = 2 ** 31 - EXP2[2047]
}

// Exp2::lookup: Q24 log2 gain → linear gain Q24.
const exp2 = (x) => {
	let i = (x >> 13) & 0x7fe
	let y = EXP2[i + 1] + Math.floor(EXP2[i] * (x & 0x3fff) / 16384)
	return y >> (6 - (x >> 24))
}

// freqlut.cc: log-frequency (Q24, 1.0 = one octave) → phase increment per sample (Q24).
// The table holds 2^44/fs·2^(i/1024); above 2^31 it overflows, hence fs > 16384.
const LUTS = new Map()
function freqTable (fs) {
	let lut = LUTS.get(fs)
	if (lut) return lut
	lut = new Int32Array(1025)
	let y = 2 ** 44 / fs
	for (let i = 0; i <= 1024; i++) { lut[i] = Math.floor(y + 0.5); y *= INC }
	LUTS.set(fs, lut)
	return lut
}
const freqLookup = (lut, logfreq) => {
	let ix = (logfreq & 0xffffff) >> 14
	let y0 = lut[ix]
	let y = y0 + Math.floor((lut[ix + 1] - y0) * (logfreq & 0x3fff) / 16384)
	return y >> (20 - (logfreq >> 24))
}

// env.cc: DX7 amplitude envelope. Level is Q24 log2 (16 bits finer than the DX7's 12-bit
// EG); rates advance once per 64-sample block. Output level 0..19 → microsteps table.
const LEVELLUT = [0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46]
const scaleOutLevel = (l) => l >= 20 ? 28 + l : LEVELLUT[l]

class Env {
	constructor (rates, levels, outlevel, rateScaling, incScale) {
		this.rates = rates; this.levels = levels; this.outlevel = outlevel
		this.rateScaling = rateScaling; this.incScale = incScale
		this.level = 0; this.target = 0; this.inc = 0; this.ix = 0
		this.rising = false; this.down = true
		this.advance(0)
	}
	sample () {
		if (this.ix < 3 || (this.ix < 4 && !this.down)) {
			if (this.rising) {
				// attack jumps to 1716 steps above floor, then rises by a level-dependent factor
				if (this.level < 112459776) this.level = 112459776 // 1716 << 16
				this.level = (this.level + ((285212672 - this.level) >> 24) * this.inc) | 0 // 17 << 24
				if (this.level >= this.target) { this.level = this.target; this.advance(this.ix + 1) }
			} else {
				this.level = (this.level - this.inc) | 0
				if (this.level <= this.target) { this.level = this.target; this.advance(this.ix + 1) }
			}
		}
		return this.level
	}
	keydown (d) {
		if (this.down !== d) { this.down = d; this.advance(d ? 0 : 3) }
	}
	advance (ix) {
		this.ix = ix
		if (ix < 4) {
			let actual = ((scaleOutLevel(this.levels[ix]) >> 1) << 6) + this.outlevel - 4256
			this.target = (actual < 16 ? 16 : actual) << 16
			this.rising = this.target > this.level
			let qrate = ((this.rates[ix] * 41) >> 6) + this.rateScaling
			if (qrate > 63) qrate = 63
			let inc = (4 + (qrate & 3)) << (2 + LG_N + (qrate >> 2))
			this.inc = this.incScale === 1 ? inc : Math.round(inc * this.incScale)
		}
	}
	// true once the envelope sits at its final level with the key up (nothing left to do)
	get done () { return !this.down && this.ix >= 4 }
}

// pitchenv.cc: pitch EG, Q24 octaves; rate and level tables measured by Levien on a DX7.
const PITCH_RATE = [
	1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 16,
	16, 17, 18, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 33, 34, 36, 37, 38, 39, 41,
	42, 44, 46, 47, 49, 51, 53, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 79, 82, 85, 88,
	91, 94, 98, 102, 106, 110, 115, 120, 125, 130, 135, 141, 147, 153, 159, 165, 171, 178, 185,
	193, 202, 211, 232, 243, 254, 255,
]
const PITCH_LEVEL = [
	-128, -116, -104, -95, -85, -76, -68, -61, -56, -52, -49, -46, -43, -41, -39, -37, -35, -33,
	-32, -31, -30, -29, -28, -27, -26, -25, -24, -23, -22, -21, -20, -19, -18, -17, -16, -15,
	-14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
	10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
	33, 34, 35, 38, 40, 43, 46, 49, 53, 58, 65, 73, 82, 92, 103, 115, 127,
]

class PitchEnv {
	constructor (rates, levels, unit) {
		this.rates = rates; this.levels = levels; this.unit = unit
		this.level = PITCH_LEVEL[levels[3]] << 19
		this.target = 0; this.inc = 0; this.ix = 0; this.rising = false; this.down = true
		this.advance(0)
	}
	sample () {
		if (this.ix < 3 || (this.ix < 4 && !this.down)) {
			if (this.rising) {
				this.level = (this.level + this.inc) | 0
				if (this.level >= this.target) { this.level = this.target; this.advance(this.ix + 1) }
			} else {
				this.level = (this.level - this.inc) | 0
				if (this.level <= this.target) { this.level = this.target; this.advance(this.ix + 1) }
			}
		}
		return this.level
	}
	keydown (d) {
		if (this.down !== d) { this.down = d; this.advance(d ? 0 : 3) }
	}
	advance (ix) {
		this.ix = ix
		if (ix < 4) {
			this.target = PITCH_LEVEL[this.levels[ix]] << 19
			this.rising = this.target > this.level
			this.inc = PITCH_RATE[this.rates[ix]] * this.unit
		}
	}
}

// lfo.cc: one LFO per voice render (the DX7 has one per instrument; MSFA shares one across
// notes). Speed, delay and six waveforms; output Q24 in 0..1.
class Lfo {
	// p: [speed, delay, pmd, amd, sync, wave] (VCED 137..142); unit = 64·25190424/fs
	constructor (p, unit) {
		let rate = p[0]
		let sr = rate === 0 ? 1 : (165 * rate) >> 6
		sr *= sr < 160 ? 11 : 11 + ((sr - 160) >> 4)
		this.delta = (unit * sr) >>> 0
		let a = 99 - p[1]
		if (a === 99) this.delayinc = this.delayinc2 = 0xffffffff
		else {
			a = (16 + (a & 15)) << (1 + (a >> 4))
			this.delayinc = (unit * a) >>> 0
			a &= 0xff80
			this.delayinc2 = (unit * (a < 0x80 ? 0x80 : a)) >>> 0
		}
		this.wave = p[5]; this.sync = p[4] !== 0
		this.phase = 0; this.rand = 0; this.delaystate = 0
	}
	sample () {
		let phase = this.phase = (this.phase + this.delta) >>> 0
		switch (this.wave) {
			case 0: { let x = phase >>> 7; if (phase >>> 31) x = ~x; return x & 0xffffff } // triangle
			case 1: return ((~phase) ^ 0x80000000) >>> 8 // saw down
			case 2: return (phase ^ 0x80000000) >>> 8 // saw up
			case 3: return ((~phase) >>> 7) & 0x1000000 // square
			case 4: return (1 << 23) + (sin(phase >>> 8) >> 1) // sine
			case 5: // sample and hold
				if (phase < this.delta) this.rand = (this.rand * 179 + 17) & 0xff
				return ((this.rand ^ 0x80) + 1) << 16
		}
		return 1 << 23
	}
	delay () {
		let d = (this.delaystate + (this.delaystate < 0x80000000 ? this.delayinc : this.delayinc2)) >>> 0
		if (d < this.delayinc) return 1 << 24
		this.delaystate = d
		return d < 0x80000000 ? 0 : (d >>> 7) & 0xffffff
	}
	keydown () {
		if (this.sync) this.phase = 0x7fffffff
		this.delaystate = 0
	}
}

// fm_op_kernel.cc, portable path. Gain ramps linearly from gain1 to gain2 across the block;
// sin·gain < 2^51 is exact in double, so floor(·/2^24) is the int64 >> 24.
function opMod (out, inp, phase, freq, gain1, gain2, add) {
	let dgain = (gain2 - gain1 + (N >> 1)) >> LG_N, gain = gain1
	for (let i = 0; i < N; i++) {
		gain += dgain
		let y = Math.floor(sin((phase + inp[i]) | 0) * gain / 16777216)
		out[i] = add ? out[i] + y : y
		phase = (phase + freq) | 0
	}
}
function opPure (out, phase, freq, gain1, gain2, add) {
	let dgain = (gain2 - gain1 + (N >> 1)) >> LG_N, gain = gain1
	for (let i = 0; i < N; i++) {
		gain += dgain
		let y = Math.floor(sin(phase) * gain / 16777216)
		out[i] = add ? out[i] + y : y
		phase = (phase + freq) | 0
	}
}
// self-feedback: the phase offset is the mean of the last two outputs, shifted (Tomisawa's
// anti-hunting filter, MSFA wiki/Dx7Hardware.wiki)
function opFb (out, phase, freq, gain1, gain2, fb, shift, add) {
	let dgain = (gain2 - gain1 + (N >> 1)) >> LG_N, gain = gain1
	let y0 = fb[0], y = fb[1]
	for (let i = 0; i < N; i++) {
		gain += dgain
		let scaled = (y0 + y) >> (shift + 1)
		y0 = y
		y = Math.floor(sin((phase + scaled) | 0) * gain / 16777216)
		out[i] = add ? out[i] + y : y
		phase = (phase + freq) | 0
	}
	fb[0] = y0; fb[1] = y
}

// fm_core.cc: the 32 algorithms, operators in patch order (OP6 first). Per operator:
// bits 0-1 output bus (0 = out, 1, 2), bit 2 add to bus, bits 4-5 input bus, bits 6-7
// feedback in and out (0xc0: the operator feeds back into itself).
const ALGORITHMS = [
	[0xc1, 0x11, 0x11, 0x14, 0x01, 0x14], [0x01, 0x11, 0x11, 0x14, 0xc1, 0x14],
	[0xc1, 0x11, 0x14, 0x01, 0x11, 0x14], [0x41, 0x11, 0x94, 0x01, 0x11, 0x14],
	[0xc1, 0x14, 0x01, 0x14, 0x01, 0x14], [0x41, 0x94, 0x01, 0x14, 0x01, 0x14],
	[0xc1, 0x11, 0x05, 0x14, 0x01, 0x14], [0x01, 0x11, 0xc5, 0x14, 0x01, 0x14],
	[0x01, 0x11, 0x05, 0x14, 0xc1, 0x14], [0x01, 0x05, 0x14, 0xc1, 0x11, 0x14],
	[0xc1, 0x05, 0x14, 0x01, 0x11, 0x14], [0x01, 0x05, 0x05, 0x14, 0xc1, 0x14],
	[0xc1, 0x05, 0x05, 0x14, 0x01, 0x14], [0xc1, 0x05, 0x11, 0x14, 0x01, 0x14],
	[0x01, 0x05, 0x11, 0x14, 0xc1, 0x14], [0xc1, 0x11, 0x02, 0x25, 0x05, 0x14],
	[0x01, 0x11, 0x02, 0x25, 0xc5, 0x14], [0x01, 0x11, 0x11, 0xc5, 0x05, 0x14],
	[0xc1, 0x14, 0x14, 0x01, 0x11, 0x14], [0x01, 0x05, 0x14, 0xc1, 0x14, 0x14],
	[0x01, 0x14, 0x14, 0xc1, 0x14, 0x14], [0xc1, 0x14, 0x14, 0x14, 0x01, 0x14],
	[0xc1, 0x14, 0x14, 0x01, 0x14, 0x04], [0xc1, 0x14, 0x14, 0x14, 0x04, 0x04],
	[0xc1, 0x14, 0x14, 0x04, 0x04, 0x04], [0xc1, 0x05, 0x14, 0x01, 0x14, 0x04],
	[0x01, 0x05, 0x14, 0xc1, 0x14, 0x04], [0x04, 0xc1, 0x11, 0x14, 0x01, 0x14],
	[0xc1, 0x14, 0x01, 0x14, 0x04, 0x04], [0x04, 0xc1, 0x11, 0x14, 0x04, 0x04],
	[0xc1, 0x14, 0x04, 0x04, 0x04, 0x04], [0xc4, 0x04, 0x04, 0x04, 0x04, 0x04],
]
const LEVEL_THRESH = 1120 // operators below this gain (both block ends) are skipped

// dx7note.cc tables. coarse → log2 ratio in Q24 (coarse 0 = ×0.5); fine → Q24 of
// log2(1 + fine/100), floor(24204406.323123·ln(1 + 0.01·fine) + 0.5), pinned.
const COARSEMUL = [
	-16777216, 0, 16777216, 26591258, 33554432, 38955489, 43368474, 47099600, 50331648, 53182516,
	55732705, 58039632, 60145690, 62083076, 63876816, 65546747, 67108864, 68576247, 69959732,
	71268397, 72509921, 73690858, 74816848, 75892776, 76922906, 77910978, 78860292, 79773775,
	80654032, 81503396, 82323963, 83117622,
]
const FINE = [
	0, 240842, 479311, 715453, 949314, 1180937, 1410364, 1637637, 1862796, 2085880, 2306926,
	2525972, 2743054, 2958205, 3171461, 3382855, 3592418, 3800183, 4006179, 4210437, 4412985,
	4613853, 4813067, 5010655, 5206643, 5401057, 5593922, 5785262, 5975102, 6163464, 6350371,
	6535847, 6719911, 6902587, 7083894, 7263853, 7442485, 7619807, 7795840, 7970602, 8144111,
	8316385, 8487441, 8657298, 8825970, 8993475, 9159829, 9325048, 9489146, 9652139, 9814042,
	9974869, 10134635, 10293353, 10451037, 10607700, 10763356, 10918018, 11071697, 11224407,
	11376159, 11526966, 11676839, 11825789, 11973829, 12120969, 12267219, 12412591, 12557096,
	12700743, 12843542, 12985504, 13126637, 13266953, 13406460, 13545168, 13683085, 13820221,
	13956584, 14092183, 14227027, 14361124, 14494482, 14627109, 14759014, 14890203, 15020685,
	15150468, 15279559, 15407964, 15535692, 15662750, 15789144, 15914881, 16039969, 16164413,
	16288221, 16411399, 16533954, 16655890,
]
const VELOCITY_DATA = [
	0, 70, 86, 97, 106, 114, 121, 126, 132, 138, 142, 148, 152, 156, 160, 163, 166, 170, 173, 174,
	178, 181, 184, 186, 189, 190, 194, 196, 198, 200, 202, 205, 206, 209, 211, 214, 216, 218, 220,
	222, 224, 225, 227, 229, 230, 232, 233, 235, 237, 238, 240, 241, 242, 243, 244, 246, 246, 248,
	249, 250, 251, 252, 253, 254,
]
const EXP_SCALE = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 16, 19, 23, 27, 33, 39, 47, 56, 66, 80, 94, 110, 126,
	142, 158, 174, 190, 206, 222, 238, 250,
]
const PITCHMODSENS = [0, 10, 20, 33, 55, 92, 153, 255]

// MIDI note → log2 frequency Q24: (1 << 24)·(log2(440) − 69/12) + note·((1 << 24) / 12)
const noteLogfreq = (note) => 50857777 + 1398101 * note

function oscFreq (logfreq, mode, coarse, fine, detune) {
	if (mode === 0) return (logfreq + COARSEMUL[coarse & 31] + FINE[fine] + 12606 * (detune - 7)) | 0
	return ((4458616 * ((coarse & 3) * 100 + fine)) >> 3) + (detune > 7 ? 13457 * (detune - 7) : 0)
}
function scaleVelocity (velocity, sens) {
	let v = velocity < 0 ? 0 : velocity > 127 ? 127 : velocity
	return ((sens * (VELOCITY_DATA[v >> 1] - 239) + 7) >> 3) << 4
}
function scaleRate (note, sens) {
	let x = ((note / 3) | 0) - 7
	return (sens * (x < 0 ? 0 : x > 31 ? 31 : x)) >> 3
}
function scaleCurve (group, depth, curve) {
	let scale = curve === 0 || curve === 3
		? (group * depth * 329) >> 12
		: (EXP_SCALE[group < 32 ? group : 32] * depth * 329) >> 15
	return curve < 2 ? -scale : scale
}
function scaleLevel (note, bp, ld, rd, lc, rc) {
	let offset = note - bp - 17
	return offset >= 0 ? scaleCurve((offset / 3) | 0, rd, rc) : scaleCurve((-offset / 3) | 0, ld, lc)
}

// floor(a·b / 2^39) for 0 ≤ a < 2^32, |b| < 2^31, exact: the int64 product of Dx7Note::compute
function mulShr39 (a, b) {
	let hi = Math.floor(a / 65536)
	return Math.floor((hi * b + Math.floor((a - hi * 65536) * b / 65536)) / 8388608)
}

/**
 * One DX7 note on the MSFA engine, streamed in 64-sample blocks of raw int32 output
 * (Dx7Note + FmCore, with its own Lfo). `patch` is a 155-byte VCED voice.
 */
export class Voice {
	constructor (patch, { note = 60, velocity = 100, fs = 44100, msfa = false } = {}) {
		if (!(fs > 16384)) throw new RangeError('dx7: fs must exceed 16384 Hz (MSFA frequency table range)')
		let key = Math.round(note)
		// integer notes take MSFA's exact path; fractional ones interpolate the same line
		let logfreq = Math.abs(note - key) < 1e-9 ? noteLogfreq(key) : Math.round(50857777 + 1398101 * note)
		let incScale = msfa ? 1 : DX7_FS / fs
		this.lut = freqTable(fs)
		this.env = []; this.ops = []; this.base = new Int32Array(6)
		for (let op = 0; op < 6; op++) {
			let o = op * 21
			let out = scaleOutLevel(patch[o + 16]) + scaleLevel(key, patch[o + 8], patch[o + 9], patch[o + 10], patch[o + 11], patch[o + 12])
			out = (out > 127 ? 127 : out) << 5
			out += scaleVelocity(velocity, patch[o + 15])
			this.env.push(new Env(
				[patch[o], patch[o + 1], patch[o + 2], patch[o + 3]],
				[patch[o + 4], patch[o + 5], patch[o + 6], patch[o + 7]],
				out < 0 ? 0 : out, scaleRate(key, patch[o + 13]), incScale))
			this.base[op] = oscFreq(logfreq, patch[o + 17], patch[o + 18], patch[o + 19], patch[o + 20])
			this.ops.push({ phase: 0, freq: 0, gain0: 0, gain1: 0 })
		}
		this.pitchenv = new PitchEnv(
			[patch[126], patch[127], patch[128], patch[129]], [patch[130], patch[131], patch[132], patch[133]],
			Math.trunc(N * (1 << 24) / (21.3 * fs) + 0.5))
		this.alg = ALGORITHMS[patch[134]]
		this.fbShift = patch[135] ? 8 - patch[135] : 16
		this.pmd = (patch[139] * 165) >> 6
		this.pms = PITCHMODSENS[patch[143] & 7]
		this.fb = new Int32Array(2)
		this.bus = [null, new Int32Array(N), new Int32Array(N)]
		this.has = new Uint8Array(3)
		this.lfo = new Lfo([patch[137], patch[138], patch[139], patch[140], patch[141], patch[142]],
			Math.trunc(N * 25190424 / fs + 0.5))
		this.lfo.keydown()
		this.carriers = this.alg.map(f => (f & 3) === 0)
	}

	/** add one 64-sample block of int32 output into `out` (Int32Array(64)) */
	block (out) {
		let lfoVal = this.lfo.sample(), lfoDelay = this.lfo.delay()
		let pitchmod = this.pitchenv.sample()
		pitchmod = (pitchmod + mulShr39(this.pmd * lfoDelay, this.pms * (lfoVal - (1 << 23)))) | 0
		let ops = this.ops, lut = this.lut, base = this.base
		for (let op = 0; op < 6; op++) {
			let p = ops[op]
			p.gain0 = p.gain1
			p.gain1 = exp2(this.env[op].sample() - 234881024) // − 14 << 24
			p.freq = freqLookup(lut, (base[op] + pitchmod) | 0)
		}
		// fm_core.cc FmCore::compute
		let alg = this.alg, bus = this.bus, has = this.has
		has[0] = 1; has[1] = 0; has[2] = 0
		for (let op = 0; op < 6; op++) {
			let flags = alg[op], p = ops[op]
			let add = (flags & 4) !== 0
			let inbus = (flags >> 4) & 3, outbus = flags & 3
			let dst = outbus === 0 ? out : bus[outbus]
			if (p.gain0 >= LEVEL_THRESH || p.gain1 >= LEVEL_THRESH) {
				if (!has[outbus]) add = false
				if (inbus === 0 || !has[inbus]) {
					if ((flags & 0xc0) === 0xc0 && this.fbShift < 16) opFb(dst, p.phase, p.freq, p.gain0, p.gain1, this.fb, this.fbShift, add)
					else opPure(dst, p.phase, p.freq, p.gain0, p.gain1, add)
				} else opMod(dst, bus[inbus], p.phase, p.freq, p.gain0, p.gain1, add)
				has[outbus] = 1
			} else if (!add) has[outbus] = 0
			p.phase = (p.phase + (p.freq << LG_N)) | 0
		}
		return out
	}

	/** release the key: every EG, and the pitch EG, enters its release segment */
	keyup () {
		for (let e of this.env) e.keydown(false)
		this.pitchenv.keydown(false)
	}

	/** key is up and every carrier's EG has reached its final level */
	get done () {
		return this.env.every((e, op) => !this.carriers[op] || e.done)
	}
}

/**
 * Raw engine output: whole 64-sample blocks of int32 (full scale of MSFA's int16 output is
 * 2^28), key released on the block boundary nearest `duration`.
 * @returns {Int32Array}
 */
export function render (patch, { note = 60, velocity = 100, fs = 44100, duration = 1, release = 1, msfa = false } = {}) {
	let v = new Voice(patch, { note, velocity, fs, msfa })
	let keyup = Math.round(duration * fs / N), blocks = keyup + Math.ceil(release * fs / N)
	let out = new Int32Array(blocks * N)
	for (let b = 0; b < blocks; b++) {
		if (b === keyup) v.keyup()
		v.block(out.subarray(b * N, b * N + N))
	}
	return out
}

const SCALE = 2 ** -28 // MSFA's int16 output keeps bits 13..28 of the engine sum
const SILENT = 2048 // |sample| below 2^11 of 2^28 (−102 dB) counts as silence for the release tail

/**
 * DX7 note, family generator contract: (freq, opts) → Float32Array.
 * @param {number} freq: Hz of the key played (within a cent of a key: that key exactly); the
 *   voice's transpose shifts it, as on the DX7
 * @param {object} opts: { patch (155-byte VCED voice, default INIT VOICE), velocity 0..1 = 1,
 *   duration (key held, s) = 1, release (s after key-up; default: until silent, at most 10 s),
 *   fs = 44100, msfa = false (true: upstream MSFA EG timing, one DX7 EG step per output sample) }
 */
export default function dx7 (freq = 440, { patch = INIT, velocity = 1, duration = 1, release = null, fs = 44100, msfa = false } = {}) {
	if (patch.length < 155) throw new RangeError('dx7: patch must be a 155-byte VCED voice (see parse)')
	// within a cent of an equal-tempered key (rounded Hz like 261.63) plays that key exactly
	let note = 69 + 12 * Math.log2(freq / 440)
	if (Math.abs(note - Math.round(note)) < 0.01) note = Math.round(note)
	note += patch[144] - 24
	let v = new Voice(patch, { note, velocity: Math.round(Math.max(0, Math.min(1, velocity)) * 127), fs, msfa })
	let keyup = Math.round(duration * fs / N)
	let max = keyup + Math.ceil((release ?? 10) * fs / N)
	let buf = new Int32Array(max * N), b = 0
	for (; b < max; b++) {
		if (b === keyup) v.keyup()
		let blk = v.block(buf.subarray(b * N, b * N + N))
		if (release == null && b > keyup && v.done) {
			let peak = 0
			for (let i = 0; i < N; i++) { let a = blk[i] < 0 ? -blk[i] : blk[i]; if (a > peak) peak = a }
			if (peak < SILENT) { b++; break }
		}
	}
	let n = release == null ? b * N : Math.min(max * N, Math.round((duration + release) * fs))
	let out = new Float32Array(n)
	for (let i = 0; i < n; i++) out[i] = buf[i] * SCALE
	return out
}

export { parse, unpack, name, INIT, MAX } from './sysex.js'
import { INIT } from './sysex.js'
