// Modal synthesis — a bank of two-pole resonators excited by an impulse or short noise
// burst, one resonator per vibrational mode (Adrien 1991, "The missing link: modal
// synthesis," in De Poli/Piccialli/Roads (eds.), Representations of Musical Signals, MIT
// Press; Cook, Real Sound Synthesis for Interactive Applications, ch. 5 "Modal Synthesis").
// Mode-ratio tables below are cited per table from Fletcher & Rossing, The Physics of
// Musical Instruments, 2nd ed. (Springer, 1998).

const LN1000 = Math.log(1000) // r = exp(-LN1000/(t60·fs)) decays an impulse response to
	// 1/1000 (= 10^(-60/20), i.e. -60dB in amplitude) after t60 seconds

// Free-free bar (Euler-Bernoulli beam) eigenvalues λk (F&R ch. 3 "Bars," transverse
// vibration of a free bar); fk/f1 = (λk/λ1)² since bending-wave frequency scales with λ².
// First four are tabulated; λk → (2k+1)π/2 for k ≥ 5 (asymptotic free-bar spacing).
const BAR_LAMBDA = [4.7300, 7.8532, 10.9956, 14.1372]
const barRatio = k => ((k <= 4 ? BAR_LAMBDA[k - 1] : (2 * k + 1) * Math.PI / 2) / BAR_LAMBDA[0]) ** 2

// Ideal circular membrane, fixed rim — f_mn/f_01 from Bessel-zero ratios, modes
// (01)(11)(21)(02)(31)(12)(41)(22) in ascending order (F&R ch. 3, Table 3.2).
const MEMBRANE_RATIOS = [1, 1.5933, 2.1355, 2.2954, 2.6531, 2.9173, 3.1555, 3.5001]

// Free circular plate (cymbal/gong class) — modes (2,0)(0,1)(3,0)(1,1)(4,0) (F&R ch. 3).
const PLATE_RATIOS = [1, 1.73, 2.328, 3.91, 4.11]

// extend a measured table past its citation by repeating its last interval — an
// approximation (no closed form beyond the modes F&R tabulates), used only when nmodes
// exceeds the table.
function extendTable (table, n) {
	if (n <= table.length) return table.slice(0, n)
	let out = table.slice(), step = table[table.length - 1] - table[table.length - 2]
	while (out.length < n) out.push(out[out.length - 1] + step)
	return out
}

// build the (ratio, gain, strike1d) list for a named model or pass custom modes through.
// strike1d marks tables whose modes get the sin(k·π·strike) strike-position weighting.
function buildModes ({ model, modes, nmodes, inharmonicity }) {
	if (modes) return modes.map((m, i) => ({ ratio: m.ratio, gain: m.gain ?? 1 / (i + 1), t60: m.t60, strike1d: false }))
	switch (model) {
		// stiff string: fk = k·f1·√(1+B·k²) (Fletcher, "Normal Vibration Frequencies of a
		// Stiff Piano String," JASA 36, 1964); B = inharmonicity, gain 1/k.
		case 'string': return Array.from({ length: nmodes }, (_, i) => { let k = i + 1
			return { ratio: k * Math.sqrt(1 + inharmonicity * k * k), gain: 1 / k, strike1d: true } })
		case 'bar': return Array.from({ length: nmodes }, (_, i) => ({ ratio: barRatio(i + 1), gain: 1 / (i + 1), strike1d: true }))
		case 'membrane': return extendTable(MEMBRANE_RATIOS, nmodes).map((r, i) => ({ ratio: r, gain: 1 / (i + 1), strike1d: false }))
		case 'plate': return extendTable(PLATE_RATIOS, nmodes).map((r, i) => ({ ratio: r, gain: 1 / (i + 1), strike1d: false }))
		// pipe acoustics (F&R ch. 8, "Wind Instruments"): an open-open (or open-closed-with-
		// both-ends-radiating) tube supports all harmonics; a closed-open tube's boundary
		// conditions cancel every even harmonic, leaving only odd multiples of f1.
		case 'tube-open': return Array.from({ length: nmodes }, (_, i) => ({ ratio: i + 1, gain: 1 / (i + 1), strike1d: true })) // all harmonics
		case 'tube-closed': return Array.from({ length: nmodes }, (_, i) => ({ ratio: 2 * (i + 1) - 1, gain: 1 / (i + 1), strike1d: true })) // odd only
		default: throw new RangeError(`modal: unknown model "${model}"`)
	}
}

/**
 * @param {object} opts
 * @param {number} freq — fundamental (mode 1) Hz
 * @param {string} model — 'string'|'bar'|'membrane'|'plate'|'tube-open'|'tube-closed'
 * @param {object[]} [modes] — custom [{ratio, gain?, t60?}, ...], overrides model/nmodes/inharmonicity
 * @param {number} nmodes — modes to draw from the model's table/series
 * @param {number} t60 — fundamental decay time, seconds (-60dB)
 * @param {number} damping — HF loss exponent: t60_k = t60·(f1/fk)^damping
 * @param {number} inharmonicity — string-only stiffness coefficient B: fk = k·f1·√(1+B·k²)
 * @param {number} strike — 0..1 strike/pluck position; 1D models (string/bar/tube) weight
 *   mode k by sin(k·π·strike) (ideal-string node formula, applied by convention to bar/tube
 *   too); 2D models (membrane/plate) are left uniform — approximating the true 2D mode-shape
 *   weighting at a point would need the Bessel/Chladni eigenmode itself, out of scope here.
 * @param {'impulse'|'noise'|Float32Array} exciter — 'noise' is a 5ms seeded burst
 * @param {?number} duration — default: covers the slowest mode's t60 (t60·1.2 + 0.05)
 * @returns {Float32Array}
 */
export default function modal ({
	freq = 440, model = 'bar', modes = null, nmodes = 8, t60 = 2, damping = 0.7,
	inharmonicity = 0, strike = 0.5, exciter = 'impulse', duration = null,
	fs = 44100, amp = 0.8, seed = 9,
} = {}) {
	let bank = buildModes({ model, modes, nmodes, inharmonicity })
	let resolved = bank.map((m, i) => {
		let fk = freq * m.ratio
		let t60k = m.t60 ?? t60 * (freq / fk) ** damping
		let gain = m.gain * (m.strike1d ? Math.sin((i + 1) * Math.PI * strike) : 1)
		return { fk, t60k, gain }
	}).filter(m => m.fk < fs / 2) // skip modes at/above Nyquist — essential, else they alias

	// worst-case co-alignment bound: every mode's |response| ≤ |gain| (after the sinθ input
	// scaling below), but modes share the excitation instant and can partially co-align, so
	// |out| ≤ amp·Σ|gain| — and the 1/k gain series sums past 1. Normalize by Σ|gain| when it
	// exceeds 1: |out| ≤ amp becomes provable, and relative mode balance (all ratio/decay/
	// strike relationships) is preserved exactly. Σ ≤ 1 banks (e.g. a single custom mode)
	// pass through untouched.
	let norm = 0
	for (let m of resolved) norm += Math.abs(m.gain)
	if (norm > 1) for (let m of resolved) m.gain /= norm

	if (duration == null) duration = Math.max(t60, ...resolved.map(m => m.t60k)) * 1.2 + 0.05
	let n = Math.round(duration * fs)
	let out = new Float32Array(n)

	let exc
	if (exciter === 'impulse') { exc = new Float32Array(1); exc[0] = 1 }
	else if (exciter === 'noise') {
		let m = Math.max(1, Math.round(0.005 * fs)) // 5ms seeded burst
		exc = new Float32Array(m)
		let s = seed >>> 0 || 1
		for (let i = 0; i < m; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; exc[i] = s / 0x3fffffff - 1 }
	} else exc = exciter // caller-supplied Float32Array, fed through the bank as-is

	for (let m of resolved) {
		let theta = 2 * Math.PI * m.fk / fs
		let r = Math.exp(-LN1000 / (m.t60k * fs))
		// impulse-invariant two-pole (Adrien/Cook): its natural impulse response is
		// h[n] = g·r^n·sin((n+1)θ)/sinθ — unscaled, that 1/sinθ term makes low-frequency
		// (small θ) modes blow up. Scaling the input by sinθ cancels it, so the response
		// becomes r^n·sin((n+1)θ): bounded by the monotonically-decaying envelope r^n·amp·gain
		// at every sample, for any freq (no blow-up as θ→0 or θ→π near Nyquist).
		let g = amp * m.gain * Math.sin(theta)
		let y1 = 0, y2 = 0, c2r = 2 * r * Math.cos(theta), r2 = r * r
		for (let i = 0; i < n; i++) {
			let x = i < exc.length ? g * exc[i] : 0
			let y0 = c2r * y1 - r2 * y2 + x
			out[i] += y0
			y2 = y1; y1 = y0
		}
	}
	return out
}
