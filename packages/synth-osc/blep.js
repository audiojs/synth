// Band-limited classic waveforms. Each is the naive shape (periodic-function's phase conventions: saw falling
// 1 → −1, square high on [0, ½), triangle falling from 1 at t = 0) plus, at every discontinuity within ±32
// samples, the band-limited step's residual (BLEP, Brandt 2001, "Hard sync without aliasing"; Välimäki &
// Huovilainen 2007, "Antialiasing oscillators in subtractive synthesis") for a jump in value, or its integral
// (BLAMP, Esqueda, Välimäki & Bilbao 2016) for a jump in slope. The step is a 64-tap Kaiser-windowed sinc
// (β = 10, cutoff 0.47·fs), linear phase; the discontinuities' positions follow from the phase and its
// increment, so no state is kept and nothing is delayed. Measured (2^18-point Blackman-Harris spectra, 55 Hz to
// 10 kHz, 44.1 and 48 kHz): aliases below 16 kHz under −94 dB re the fundamental, the analysis floor, and under
// −75 dB anywhere; harmonics within 0.01 dB of the ideal to 16 kHz, 0.8 dB low at 0.45·fs.

const K = 32, O = 128, FC = 0.47, BETA = 10, TYPES = ['sine', 'square', 'sawtooth', 'triangle']

let H, R   // ∫h and ∫(∫h − step), tabulated O per sample over (−K, K)
// Built once for the module: where an instance is built (osc's factory: `type` is live, so any block of a stream may
// be its first of a band-limited wave, and process makes nothing), else at the first band-limited `wave`. Two tables of
// 64 KB: h is written over by R, which is made from H alone. Then each wave a few times, so that V8 has seen every
// path of `value` before it optimizes a stream's loop: a path first taken seconds into a stream (a square after a
// minute of sine) would deoptimize the loop, and the code it falls back to boxes numbers until V8 optimizes it again
export function tables () {
	if (H) return
	let L = 2 * K * O + 1, h = new Float64Array(L)
	let I0 = x => { let s = 1, t = 1; for (let k = 1; k < 60; k++) { t *= (x / 2 / k) ** 2; s += t } return s }
	for (let i = 0; i < L; i++) {
		let x = i / O - K, u = x / K
		h[i] = (x ? Math.sin(2 * Math.PI * FC * x) / (Math.PI * x) : 2 * FC) * I0(BETA * Math.sqrt(Math.max(0, 1 - u * u))) / I0(BETA)
	}
	let sum = 0
	for (let i = 1; i < L; i++) sum += (h[i - 1] + h[i]) / 2
	H = new Float64Array(L)
	for (let i = 1; i < L; i++) H[i] = H[i - 1] + (h[i - 1] + h[i]) / 2 / sum
	// R integrates r = H − step; the cell ending on the step takes r's left limit there
	R = h; R[0] = 0
	for (let i = 1, c = K * O; i < L; i++) {
		let r0 = H[i - 1] - (i - 1 >= c ? 1 : 0), r1 = H[i] - (i > c ? 1 : 0)
		R[i] = R[i - 1] + (r0 + r1) / 2 / O
	}
	// the waves in turn, 16 times each: V8 keeps no record of a function's first calls (some 8 on Node 22 and 25; it
	// makes the record lazily), and from then on sees each path many times. At dt 0.1 a discontinuity sums 3 samples
	// on either side, so both loops of `residuals` run
	for (let i = 0; i < 64; i++) { io[0] = i / 64; io[1] = 0.1; value(TYPES[i & 3]) }
}

// The waveform at the phase io[0] advancing io[1] a sample, into io[2], and the residuals it sums, into io[2] as well:
// no number crosses a call, because V8 boxes a double passed to or returned from a function it did not inline (square
// and triangle sum two discontinuities a sample, and V8 then inlined neither these nor `wave` into a block's loop)
const io = new Float64Array(3)

// sum of the step's (H) or the ramp's (R) residual over the discontinuities at phase `at`, past and coming, within K
// samples: a step x samples after the jump (x < 0: before it) leaves ∫h − 1 (∫h before it), a unit change of slope per
// sample ∫(∫h − step); `after` is that 1, or 0 for the ramp. Each read from its table by linear interpolation
function residuals (T, after, at) {
	let dt = io[1], p = io[0] - at, s = 0, last = T.length - 1
	if (p < 0) p += 1
	for (let x = p / dt; x < K; x += 1 / dt) { let q = (x + K) * O, i = q | 0; s += (i >= last ? T[last] : T[i] + (T[i + 1] - T[i]) * (q - i)) - after }
	for (let x = (p - 1) / dt; x > -K; x -= 1 / dt) { let q = (x + K) * O, i = q | 0; s += i >= last ? T[last] : T[i] + (T[i + 1] - T[i]) * (q - i) }
	io[2] = s
}

function value (type) {
	let t = io[0], dt = io[1], bl = dt > 0, s = 0
	if (type === 'sine') { io[2] = Math.sin(2 * Math.PI * t); return }
	if (type === 'sawtooth') { if (bl) { residuals(H, 1, 0); s = 2 * io[2] } io[2] = 1 - 2 * t + s; return }
	if (type === 'square') { if (bl) { residuals(H, 1, 0); s = io[2]; residuals(H, 1, 0.5); s = 2 * (s - io[2]) } io[2] = (t < 0.5 ? 1 : -1) + s; return }
	if (type === 'triangle') { if (bl) { residuals(R, 0, 0.5); s = io[2]; residuals(R, 0, 0); s = 8 * dt * (s - io[2]) } io[2] = (t < 0.5 ? 1 - 4 * t : 4 * t - 3) + s; return }
	throw new RangeError(`wave: unknown type "${type}"`)
}

/**
 * Band-limited waveform value at phase t ∈ [0, 1) advancing dt = f/fs per sample.
 * @param {'sine'|'sawtooth'|'square'|'triangle'} type
 */
export function wave (type, t, dt) {
	if (!H && type !== 'sine') tables()
	io[0] = t; io[1] = dt
	value(type)
	return io[2]
}

/** One block of the waveform into `out`, `st` = [phase, increment], the phase advanced past it, each sample scaled by
 *  its gain in `gains` (the manifest's loop: nothing in it is boxed; `tables` has run, in the manifest's factory) */
export function fill (type, st, out, gains) {
	let t = st[0], dt = st[1]
	for (let i = 0; i < out.length; i++) {
		io[0] = t; io[1] = dt
		value(type)
		out[i] = gains[i] * io[2]
		t += dt
		t -= Math.floor(t)
	}
	st[0] = t
}
