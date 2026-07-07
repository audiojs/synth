// DTMF — ITU-T Q.23 dual tones per key, with inter-digit gaps.

const ROW = { 1: 697, 2: 697, 3: 697, A: 697, 4: 770, 5: 770, 6: 770, B: 770, 7: 852, 8: 852, 9: 852, C: 852, '*': 941, 0: 941, '#': 941, D: 941 }
const COL = { 1: 1209, 4: 1209, 7: 1209, '*': 1209, 2: 1336, 5: 1336, 8: 1336, 0: 1336, 3: 1477, 6: 1477, 9: 1477, '#': 1477, A: 1633, B: 1633, C: 1633, D: 1633 }

export default function dtmf (digits, { fs = 44100, tone = 0.08, gap = 0.04, amp = 0.45 } = {}) {
	let toneN = Math.round(tone * fs), gapN = Math.round(gap * fs)
	let out = new Float32Array(digits.length * (toneN + gapN))
	let pos = 0
	for (let d of String(digits).toUpperCase()) {
		let r = ROW[d], c = COL[d]
		if (r) for (let i = 0; i < toneN; i++) out[pos + i] = amp * (Math.sin(2 * Math.PI * r * i / fs) + Math.sin(2 * Math.PI * c * i / fs))
		pos += toneN + gapN
	}
	return out
}
