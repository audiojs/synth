// FM synthesis — Chowning 1973, "The Synthesis of Complex Audio Spectra by Means of
// Frequency Modulation" (JAES 21(7), 526-534). Implemented as PHASE modulation (DX7-style):
// the modulator offsets the carrier's phase directly (θc[n] + I·sin(θm[n])) rather than
// integrating a modulated instantaneous frequency. The two are spectrally identical for a
// sinusoidal modulator (Chowning's own derivation expands sin(θc + I·sin(θm)) via the
// Bessel–Jacobi identity — the same expansion holds whether I·sin(θm) is read as a phase
// or a frequency deviation integrated back to phase), but phase modulation needs no running
// integral of frequency, so it can't accumulate drift the way a naive FM integrator does.
// Every DX-style FM synth is, technically, a phase modulator.

// exponential decay of a value from v0 toward floor with time constant tau (seconds);
// tau <= 0 means static (classic Chowning "brightness decay": index falls as the tone dies)
const decayed = (v0, floor, tau, t) => tau > 0 ? floor + (v0 - floor) * Math.exp(-t / tau) : v0

/**
 * @param {object} opts
 * @param {number} freq — carrier Hz
 * @param {number} ratio — modulator:carrier frequency ratio (single-op form)
 * @param {number} index — peak modulation index I, radians
 * @param {number} indexDecay — seconds (time constant); exp decay of index toward indexFloor; 0 = static
 * @param {number} indexFloor
 * @param {number} feedback — modulator self-feedback, radians (DX-style single-tap: sin(θ + fb·prevOut))
 * @param {object[]} [ops] — serial modulator stack [{ratio, index, indexDecay?, indexFloor?, feedback?}, ...],
 *   innermost-first, each op's (index-scaled) output phase-modulates the next; the last modulates the carrier.
 *   Overrides ratio/index/indexDecay/indexFloor/feedback — the single-op form is just ops=[{...}].
 * @returns {Float32Array}
 */
export default function fm ({
	freq = 440, ratio = 2, index = 5, indexDecay = 0, indexFloor = 0, feedback = 0,
	ops = null,
	duration = 1, fs = 44100, amp = 0.8, attack = 0.005, release = 0.1,
} = {}) {
	let stack = ops || [{ ratio, index, indexDecay, indexFloor, feedback }]
	let k = stack.length
	let opDt = new Float64Array(k), opIndex = new Float64Array(k), opFloor = new Float64Array(k),
		opTau = new Float64Array(k), opFb = new Float64Array(k), opPhase = new Float64Array(k), opPrev = new Float64Array(k)
	for (let j = 0; j < k; j++) {
		let o = stack[j]
		opDt[j] = 2 * Math.PI * (o.ratio ?? 1) * freq / fs
		opIndex[j] = o.index ?? 1
		opFloor[j] = o.indexFloor ?? 0
		opTau[j] = o.indexDecay ?? 0
		opFb[j] = o.feedback ?? 0
	}

	let n = Math.round(duration * fs)
	let out = new Float32Array(n)
	let cDt = 2 * Math.PI * freq / fs, cPhase = 0
	let aN = Math.round(attack * fs), rN = Math.round(release * fs)

	for (let i = 0; i < n; i++) {
		let t = i / fs
		let mod = 0 // phase deviation carried into the next op, carrier last
		for (let j = 0; j < k; j++) {
			opPhase[j] += opDt[j]
			let idx = decayed(opIndex[j], opFloor[j], opTau[j], t)
			let y = Math.sin(opPhase[j] + mod + opFb[j] * opPrev[j])
			opPrev[j] = y
			mod = idx * y
		}
		cPhase += cDt
		let av = aN > 0 ? Math.min(1, i / aN) : 1
		let rv = rN > 0 ? Math.min(1, (n - 1 - i) / rN) : 1
		out[i] = amp * av * rv * Math.sin(cPhase + mod)
	}
	return out
}

// Chowning 1973's bell/gong instrument: an inharmonic c:m = 1:1.4 ratio (§ the "simple FM"
// bell example) with a bright onset whose modulation index decays over a couple of seconds —
// brightness tracking amplitude decay is the trick that makes it read as a struck metal body.
export function bell ({ freq = 440, duration = 4, ...opts } = {}) {
	return fm({ freq, ratio: 1.4, index: 10, indexDecay: 2, indexFloor: 0, duration, attack: 0.001, release: duration * 0.6, ...opts })
}

// Classic 2-operator DX7-style electric piano voicing (folklore, not from Chowning's paper):
// near-unison ratio, moderate index, fast decay — the familiar FM e-piano "bark" transient.
export function epiano ({ freq = 440, duration = 1.5, ...opts } = {}) {
	return fm({ freq, ratio: 1, index: 3, indexDecay: 0.15, indexFloor: 0.3, duration, attack: 0.002, release: duration * 0.3, ...opts })
}
