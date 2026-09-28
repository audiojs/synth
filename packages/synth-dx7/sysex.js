// DX7 voice data: VMEM 32-voice bulk dumps, VCED single voices, and the INIT voice.
// Formats per the Yamaha DX7 Operating Manual, "MIDI Data Format" (VCED: format 0, 155
// bytes; VMEM: format 9, 4096 bytes = 32 packed voices of 128 bytes). unpack() is a port of
// MSFA patch.cc UnpackPatch (Copyright 2012 Google Inc., Apache License 2.0), plus clamping
// to the documented parameter ranges, which leaves valid data unchanged.

// VCED parameter maxima (minimum 0), in VCED order: operators OP6..OP1, 21 each, then globals;
// the knob bounds for sound matching over the 155 voice parameters.
const OP_MAX = [99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 3, 3, 7, 3, 7, 99, 1, 31, 99, 14]
//             R1  R2  R3  R4  L1  L2  L3  L4  BP  LD  RD LC RC RS AMS KVS OL M CRS FINE DET
const GLOBAL_MAX = [99, 99, 99, 99, 99, 99, 99, 99, 31, 7, 1, 99, 99, 99, 99, 1, 5, 7, 48]
//                  PR1-4           PL1-4          ALG FB OKS LFS LFD PMD AMD SYNC WAVE PMS TRNP
export const MAX = new Uint8Array(155)
for (let op = 0; op < 6; op++) MAX.set(OP_MAX, op * 21)
MAX.set(GLOBAL_MAX, 126)
MAX.fill(127, 145) // voice name, ASCII

const clamp = (v) => { for (let i = 0; i < 155; i++) if (v[i] > MAX[i]) v[i] = MAX[i]; return v }

/** VMEM packed voice (128 bytes) → VCED voice (155 bytes). MSFA UnpackPatch. */
export function unpack (bulk) {
	let p = new Uint8Array(155)
	for (let op = 0; op < 6; op++) {
		let o = op * 21, b = op * 17
		for (let i = 0; i < 11; i++) p[o + i] = bulk[b + i] // EG rates, levels, break point, depths
		p[o + 11] = bulk[b + 11] & 3 // left curve
		p[o + 12] = (bulk[b + 11] >> 2) & 3 // right curve
		p[o + 13] = bulk[b + 12] & 7 // rate scaling
		p[o + 20] = bulk[b + 12] >> 3 // detune
		p[o + 14] = bulk[b + 13] & 3 // amplitude mod sensitivity
		p[o + 15] = bulk[b + 13] >> 2 // key velocity sensitivity
		p[o + 16] = bulk[b + 14] // output level
		p[o + 17] = bulk[b + 15] & 1 // oscillator mode
		p[o + 18] = bulk[b + 15] >> 1 // frequency coarse
		p[o + 19] = bulk[b + 16] // frequency fine
	}
	for (let i = 0; i < 9; i++) p[126 + i] = bulk[102 + i] // pitch EG, algorithm
	p[135] = bulk[111] & 7 // feedback
	p[136] = bulk[111] >> 3 // oscillator key sync
	for (let i = 0; i < 4; i++) p[137 + i] = bulk[112 + i] // LFO speed, delay, PMD, AMD
	p[141] = bulk[116] & 1 // LFO sync
	p[142] = (bulk[116] >> 1) & 7 // LFO wave
	p[143] = bulk[116] >> 4 // pitch mod sensitivity
	for (let i = 0; i < 11; i++) p[144 + i] = bulk[117 + i] // transpose, name
	return clamp(p)
}

/** voice name, trailing spaces removed */
export const name = (patch) => String.fromCharCode(...Array.prototype.slice.call(patch, 145, 155)).trimEnd()

const voice = (patch) => ({ name: name(patch), patch })

/**
 * Voices from DX7 sysex: a 32-voice cartridge (F0 43 0n 09 20 00, 4104 bytes), a single
 * voice (F0 43 0n 00 01 1B, 163 bytes), any sequence of these messages, or headerless data
 * (4096 bytes VMEM, 155 bytes VCED, 128 bytes one packed voice). Checksums are not enforced:
 * many circulating cartridges carry wrong ones. Some writers store a cartridge's byte count as
 * a plain 16-bit number (10 00) instead of the manual's 7-bit pair (20 00); both read as 4096.
 * Other messages in a file (a DX7II performance, another maker's data) are skipped.
 * @param {Uint8Array|ArrayBuffer|ArrayLike<number>} bytes
 * @returns {{ name: string, patch: Uint8Array }[]}
 */
export function parse (bytes) {
	let d = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
	if (d[0] !== 0xf0) {
		if (d.length === 4096) return bank(d)
		if (d.length === 155) return [voice(clamp(Uint8Array.from(d)))]
		if (d.length === 128) return [voice(unpack(d))]
		throw new RangeError(`dx7: unrecognized voice data (${d.length} bytes, no sysex header)`)
	}
	let out = [], skipped
	for (let i = 0; i < d.length;) {
		if (d[i] !== 0xf0) { i++; continue }
		if (i + 6 > d.length) throw new RangeError('dx7: truncated sysex message')
		// sub-status 0 (F0 43 0n) is a bulk dump; 1 (F0 43 1n) a parameter change, whose third byte is a group, not a format
		let yamaha = d[i + 1] === 0x43, dump = (d[i + 2] & 0x70) === 0, format = d[i + 3], size = (d[i + 4] << 7) | d[i + 5]
		if (format === 9 && ((d[i + 4] << 8) | d[i + 5]) === 4096) size = 4096
		if (yamaha && dump && (format === 9 && size === 4096 || format === 0 && size === 155)) {
			let data = d.subarray(i + 6, i + 6 + size)
			if (data.length < size) throw new RangeError('dx7: truncated sysex message')
			if (format === 9) out.push(...bank(data))
			else out.push(voice(clamp(Uint8Array.from(data))))
			i += 6 + size + 2 // checksum, F7
			continue
		}
		skipped ??= !yamaha ? 'not a Yamaha sysex message' : !dump ? 'a parameter change, not a bulk dump' : `unsupported sysex format ${format} (${size} bytes)`
		let end = d.indexOf(0xf7, i + 1)
		i = end < 0 ? d.length : end + 1
	}
	if (!out.length) throw new RangeError(`dx7: no voices found${skipped ? ` (${skipped})` : ''}`)
	return out
}

const bank = (data) => Array.from({ length: 32 }, (_, v) => voice(unpack(data.subarray(v * 128, v * 128 + 128))))

// INIT VOICE: the DX7's voice-initialize state (DX7 Operating Manual, "Voice Initialize"):
// algorithm 1, only OP1 sounding at output level 99, EG rates 99, levels 99/99/99/0,
// break point C3 (39), ratio 1.00, detune 0 (7), pitch EG flat at 50, LFO speed 35 triangle
// synced, PMS 3, transpose C3 (24).
export const INIT = new Uint8Array(155)
for (let op = 0; op < 6; op++) {
	INIT.set([99, 99, 99, 99, 99, 99, 99, 0, 39, 0, 0, 0, 0, 0, 0, 0, op === 5 ? 99 : 0, 0, 1, 0, 7], op * 21)
}
INIT.set([99, 99, 99, 99, 50, 50, 50, 50, 0, 0, 1, 35, 0, 0, 0, 1, 0, 3, 24], 126)
INIT.set([...'INIT VOICE'].map(c => c.charCodeAt(0)), 145)
