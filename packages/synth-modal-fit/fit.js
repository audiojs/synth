// Modal snapshot from audio: the inverse of @audio/synth-modal. One strike → { freq, amp, modes:
// [{ ratio, gain, t60 }] }, synth-modal's own options, so modal(s.freq, s) plays it back.
//
// A struck object rings as a sum of exponentially decaying sinusoids, one per mode, all starting
// at the strike. Their poles are found band by band, their amplitudes all at once:
// 1. Onset: the first sample within 20 dB of the peak opens the analysis.
// 2. Noise: minimum statistics (Martin 2001), each bin's median power over 93 ms frames, the
//    lower fifth of those across a band and its neighbours; a Blackman–Harris window (Harris
//    1978) keeps a ringing mode's own leakage 92 dB under it.
// 3. Subbands: the strike's spectrum is cut into overlapping bands (200 Hz up to 2 kHz, a tenth
//    of the frequency above), each taken through the DFT of a Kaiser-windowed lowpass (Kaiser
//    1974) to complex baseband and decimated. Convolution with a finite kernel keeps every pole:
//    from the kernel's half length on, a band is exactly a sum of the same damped exponentials.
// 4. Poles: the matrix pencil (Hua & Sarkar 1990) on each band from the end of the excitation
//    (5 ms), its order the Hankel eigenvalues standing above the band's noise. It resolves modes
//    closer than an FFT bin while the strike lasts long enough to tell them apart (Laroche 1993).
//    A band keeps the poles of its central part; a mode on an edge, seen by both neighbours, keeps
//    the more central estimate.
// 5. Amplitudes: least squares on every pole at once, the Gram matrix in closed form (geometric
//    sums), so overlapping modes share energy correctly. A pole that carries no energy after the
//    excitation only fitted the excitation, and is dropped; the rest are fitted from the onset.
// 6. Strike instant and signs: synth-modal starts every mode in sine phase, r^n·sin((n+1)θ), at one
//    sample, and a gain's sign is the only phase it has. The instant within 1 ms of the onset
//    that brings the modes closest to sine phase is the strike; the signs then minimize the
//    squared error to the strike (coordinate descent over ±1).
//
// References: R. Martin, "Noise power spectral density estimation based on optimal smoothing and
// minimum statistics", IEEE Trans. Speech Audio Proc. 9(5), 2001; F. J. Harris, "On the use of
// windows for harmonic analysis with the discrete Fourier transform", Proc. IEEE 66(1), 1978;
// J. F. Kaiser, "Nonrecursive digital filter design using the I0-sinh window function", Proc.
// IEEE ISCAS 1974; Y. Hua, T. K. Sarkar, "Matrix pencil method for estimating parameters of
// exponentially damped/undamped sinusoids in noise", IEEE Trans. ASSP 38(5), 1990; J. Laroche,
// "The use of the matrix pencil method for the spectrum analysis of musical signals", JASA 94(4),
// 1993; J. H. Wilkinson, The Algebraic Eigenvalue Problem, 1965 (shifted QR); JAMA (NIST and
// MathWorks, public domain): tred2/tql2 for the symmetric eigenproblem.

import { cfft, cifft } from 'fourier-transform'

const LN1000 = Math.log(1000) // t60: the envelope falls to 1/1000 (−60 dB), as in synth-modal
const ONSET = 0.1 // the analysis opens at the first sample within −20 dB of the peak
const FMIN = 20 // Hz, lowest band edge
const DMIN = 200, Q = 10 // band width: 200 Hz up to 2 kHz, then a tenth of the frequency
const ATT = 60 // dB, kernel stopband: leakage from outside a band stays under it
const LSHORT = 24, LMAX = 64 // pencil lengths
const NOISE = 2 // a component stands twice above the band's largest noise eigenvalue
const RELTOL = 1e-10 // and within 100 dB of the band's strongest
const TMAX = 100 // s, t60 of a pole the strike shows no decay for
const STRIKE = 0.001 // s, the strike instant is searched within ±1 ms of the onset
const ATTACK = 0.005 // s, the excitation (a mallet's contact, a clash): modes are told apart after it

/**
 * @param {Float32Array|Float64Array|ArrayLike<number>|ArrayLike<number>[]} data: one strike, from
 *   shortly before its onset to before the next; mono, or channels (mixed)
 * @param {object} opts: { fs = 44100, freq: Hz of ratio 1 (default: the mode carrying the most
 *   energy), nmodes: keep at most this many modes, strongest by energy (default all), floor: drop
 *   modes whose energy after the excitation falls this many dB under the strike's (default −80) }
 * @returns {{ freq: number, amp: number, modes: { ratio: number, gain: number, t60: number }[] }}
 */
export default function fit (data, { fs = 44100, freq = null, nmodes = Infinity, floor = -80 } = {}) {
	let x = mono(data), peak = 0
	for (let v of x) peak = Math.max(peak, Math.abs(v))
	if (!peak) throw new RangeError('modal-fit: silent input')
	let t0 = 0
	while (Math.abs(x[t0]) < ONSET * peak) t0++
	let s = x.subarray(t0), N = s.length
	if (N < 0.02 * fs) throw new RangeError('modal-fit: need at least 20 ms after the onset')

	let { Nfft, bands } = layout(N, fs), g0 = Math.min(Math.round(ATTACK * fs), N >> 2)
	let found = dedup(bandPoles(spectrum(s, Nfft), noise(s, bands, fs), N, fs, Nfft, bands, g0), N)
	let { poles, amps } = solve(s, found, floor, nmodes, g0)
	if (!poles.length) throw new RangeError('modal-fit: no modes found')

	// strike instant τ, samples from the onset: mode Re(C·e^{pn}) reads g·e^{−α(n−τ)}·sin((n−τ+1)ω)
	// when C·e^{pτ}·i·e^{−iω} is real; τ maximizes Σ|C|²·cos² of that phase (ties, as a harmonic
	// series repeats every period: the nearest to the onset)
	let w = amps.map(([re, im]) => re * re + im * im), half = Math.round(STRIKE * fs), tau = 0, best = -1
	const phase = (k, t) => Math.atan2(amps[k][1], amps[k][0]) + poles[k].w * t + Math.PI / 2 - poles[k].w
	for (let i = -20 * half; i <= 20 * half; i++) {
		let t = i / 20, J = 0
		for (let k = 0; k < poles.length; k++) J += w[k] * Math.cos(phase(k, t)) ** 2
		if (J > best + 1e-12 * best) { best = J; tau = t }
		else if (J > best - 1e-12 * best && Math.abs(t) < Math.abs(tau)) tau = t
	}
	let g = signs(s, poles, poles.map((p, k) => Math.sign(Math.cos(phase(k, tau)) || 1) * Math.sqrt(w[k]) * Math.exp(-p.a * tau)), tau)

	// ratio 1 and gain 1: the mode with the most energy; amp = Σ|amplitude|, which synth-modal
	// divides back out of gains summing past 1, so each mode rings at its measured amplitude
	let energy = poles.map((p, k) => w[k] / 2 * geo(-2 * p.a, 0, N)[0]), ref = energy.indexOf(Math.max(...energy))
	let hz = (k) => poles[k].w * fs / (2 * Math.PI), f1 = freq ?? hz(ref), unit = Math.abs(g[ref])
	let modes = poles.map((p, k) => ({ ratio: hz(k) / f1, gain: g[k] / unit, t60: p.a > 0 ? Math.min(TMAX, LN1000 / (p.a * fs)) : TMAX }))
	return { freq: f1, amp: g.reduce((a, v) => a + Math.abs(v), 0), modes: modes.sort((a, b) => a.ratio - b.ratio) }
}

function mono (data) {
	if (data[0]?.length == null) return Float64Array.from(data)
	let x = new Float64Array(data[0].length)
	for (let ch of data) for (let i = 0; i < x.length; i++) x[i] += ch[i] / data.length
	return x
}

const pow2 = (n) => 2 ** Math.ceil(Math.log2(n))

// Bessel I0 by its power series (Abramowitz & Stegun 9.6.12), for the Kaiser window
function i0 (x) {
	let s = 1, t = 1
	for (let k = 1; k < 200 && t > 1e-17 * s; k++) { t *= (x / (2 * k)) ** 2; s += t }
	return s
}

// Kaiser-windowed lowpass, cutoff fc Hz, transition T Hz: its odd length, and its DTFT at bins
// j = 0..K of an Nfft-point grid (real and even: H(−j) = H(j))
const KERNELS = new Map()
function kernel (fc, T, fs, Nfft, K) {
	let key = [fc, T, fs, Nfft, K].join()
	if (KERNELS.has(key)) return KERNELS.get(key)
	let beta = 0.1102 * (ATT - 8.7), L = Math.ceil((ATT - 8) / (2.285 * 2 * Math.PI * T / fs)) | 1, half = (L - 1) / 2
	let h = new Float64Array(half + 1), b0 = i0(beta)
	for (let n = 0; n <= half; n++) {
		let a = 2 * fc / fs, sinc = n ? Math.sin(Math.PI * a * n) / (Math.PI * n) : a
		h[n] = sinc * i0(beta * Math.sqrt(1 - (n / half) ** 2)) / b0
	}
	let H = new Float64Array(K + 1)
	for (let j = 0; j <= K; j++) {
		let c = Math.cos(2 * Math.PI * j / Nfft), c1 = 1, c2 = c, v = h[0] // Chebyshev: cos(nω) by recurrence
		for (let n = 1; n <= half; n++) { v += 2 * h[n] * c2; let c3 = 2 * c * c2 - c1; c1 = c2; c2 = c3 }
		H[j] = v
	}
	let k = { H, half }
	KERNELS.set(key, k)
	return k
}

// Signs. Each mode plays g·e^{−α(n−τ)}·sin((n−τ+1)ω) = Re(−i·e^{iω(1−τ)+ατ}·g·e^{pn}); with the
// magnitudes |g| fixed, flip the sign of whichever mode lowers the squared error to s most, until
// none does (coordinate descent on a quadratic in ±1; the Gram in closed form). Starts from the
// signs of each mode's own phase, which stand where the modes do not overlap.
function signs (s, poles, g, tau) {
	let N = s.length, K = poles.length, m = g.map(Math.abs), sg = g.map(Math.sign)
	let beta = poles.map(({ a, w }) => [Math.exp(a * tau) * Math.sin(w * (1 - tau)), -Math.exp(a * tau) * Math.cos(w * (1 - tau))]) // −i·e^{iω(1−τ)+ατ}
	let G = Array.from({ length: K }, () => new Float64Array(K)), b = new Float64Array(K)
	for (let j = 0; j < K; j++) for (let k = j; k < K; k++) {
		let [ar, ai] = beta[j], [br, bi] = beta[k], pj = poles[j], pk = poles[k]
		let [sr, si] = geo(-pj.a - pk.a, pj.w + pk.w, N), [tr, ti] = geo(-pj.a - pk.a, pj.w - pk.w, N)
		let abr = ar * br - ai * bi, abi = ar * bi + ai * br, acr = ar * br + ai * bi, aci = ai * br - ar * bi // a·b, a·b̄
		G[j][k] = G[k][j] = ((abr * sr - abi * si) + (acr * tr - aci * ti)) / 2 // ⟨Re(a e^{pn}), Re(b e^{qn})⟩
	}
	for (let k = 0; k < K; k++) {
		let { a, w } = poles[k], [br, bi] = beta[k], cr = 0, ci = 0, er = Math.exp(-a) * Math.cos(w), ei = Math.exp(-a) * Math.sin(w), ur = 1, ui = 0
		for (let n = 0; n < N; n++) {
			if (!(n & 1023)) { let e = Math.exp(-a * n); ur = e * Math.cos(w * n); ui = e * Math.sin(w * n) }
			cr += s[n] * ur; ci += s[n] * ui
			let t = ur * er - ui * ei; ui = ur * ei + ui * er; ur = t
		}
		b[k] = br * cr - bi * ci // ⟨s, Re(β e^{pn})⟩ = Re(β·Σ s e^{pn})
	}
	let r = b.map((v, k) => v - sg.reduce((a, sj, j) => a + (j === k ? 0 : sj * m[j] * G[k][j]), 0)) // b − Σ_{j≠k} s_j m_j G_kj
	for (let it = 0; it < 4 * K; it++) {
		let best = -1, gain = 0
		for (let k = 0; k < K; k++) { let d = 4 * sg[k] * m[k] * r[k]; if (d < gain) { gain = d; best = k } } // ΔJ of flipping k
		if (best < 0) break
		sg[best] = -sg[best]
		for (let k = 0; k < K; k++) if (k !== best) r[k] -= 2 * sg[best] * m[best] * G[k][best]
	}
	return g.map((_, k) => sg[k] * m[k])
}

// Amplitudes. Which poles are modes is read after the excitation (g0 on): a pole that only
// helps fit the excitation (a burst, a clash) carries no energy there and falls under the floor,
// as do those past nmodes. The amplitudes of the rest are then fitted from the onset, the attack
// included.
function solve (s, poles, floor, nmodes, g0) {
	let { energy } = amplitudes(s.subarray(g0), poles), total = energy.reduce((a, b) => a + b, 0)
	poles = poles.map((p, k) => k).filter(k => energy[k] >= total * 10 ** (floor / 10)).sort((a, b) => energy[b] - energy[a]).slice(0, nmodes).map(k => poles[k])
	return { poles, amps: amplitudes(s, poles).amps }
}

// noise power per bin of the strike's whole spectrum, per band. Minimum statistics (Martin
// 2001): each bin's median power over 93 ms frames (a mode rings through them, the clash does
// not), then the lower fifth of those over the band and a band-width either side (the bins
// between modes), each corrected to the mean of an exponential variable. The 4-term
// Blackman–Harris window (Harris 1978) keeps a ringing mode's leakage 92 dB down outside its own
// ±4 bins, under any noise the bins between modes could show.
const FRAME = 4096, BH = [0.35875, 0.48829, 0.14128, 0.01168]
function noise (s, bands, fs) {
	let N = s.length, F = Math.min(FRAME, 2 ** Math.floor(Math.log2(N / 2))), w = new Float64Array(F), w2 = 0, frames = []
	for (let i = 0; i < F; i++) { let x = 2 * Math.PI * i / F; w[i] = BH[0] - BH[1] * Math.cos(x) + BH[2] * Math.cos(2 * x) - BH[3] * Math.cos(3 * x); w2 += w[i] * w[i] }
	for (let p = 0; p + F <= N; p += F / 4) {
		let re = new Float64Array(F), im = new Float64Array(F)
		for (let i = 0; i < F; i++) re[i] = s[p + i] * w[i]
		cfft(re, im)
		frames.push(re.subarray(0, F / 2 + 1).map((v, k) => v * v + im[k] * im[k]))
	}
	let med = new Float64Array(F / 2 + 1), col = new Float64Array(frames.length)
	for (let k = 0; k <= F / 2; k++) { frames.forEach((f, t) => col[t] = f[k]); col.sort(); med[k] = col[col.length >> 1] / Math.LN2 }
	return bands.map(({ lo, hi }) => {
		let d = hi - lo, v = Array.from(med.subarray(Math.max(1, Math.floor((lo - d) * F / fs)), Math.min(F / 2, Math.ceil((hi + d) * F / fs)) + 1)).sort((a, b) => a - b)
		return v[Math.floor(0.2 * v.length)] / -Math.log(0.8) * N / w2 // a frame's power to the whole strike's
	})
}

// bands: edges every DMIN Hz up to DMIN·Q, then a Q-th of the frequency; the FFT holds the
// strike and the longest kernel
function layout (N, fs) {
	let top = 0.98 * fs / 2, edges = [FMIN]
	while (edges[edges.length - 1] < top) { let b = edges[edges.length - 1]; edges.push(Math.min(top, b + Math.max(DMIN, b / Q))) }
	let longest = Math.ceil((ATT - 8) / (2.285 * 2 * Math.PI * DMIN / fs)) | 1
	return { Nfft: pow2(N + longest), bands: edges.slice(1).map((hi, i) => ({ lo: edges[i], hi })) }
}

function spectrum (x, Nfft) {
	let re = new Float64Array(Nfft), im = new Float64Array(Nfft)
	re.set(x); cfft(re, im)
	return { re, im }
}

// poles of every band, as log-poles per sample { a: decay rate α, w: frequency ω } (e^{(−α+iω)n});
// X the strike's spectrum, Pn each band's noise power per bin of it
function bandPoles ({ re, im }, Pn, N, fs, Nfft, bands, g0) {
	const bin = (f) => f * Nfft / fs
	const energy = ({ lo, hi }) => { let e = 0; for (let k = Math.ceil(bin(lo)); k < bin(hi); k++) e += re[k] * re[k] + im[k] * im[k]; return e }
	let emax = Math.max(...bands.map(energy)), poles = []
	for (let [b, { lo, hi }] of bands.entries()) {
		if (energy({ lo, hi }) < 1e-10 * emax) continue // −100 dB: nothing a pencil could keep (RELTOL)
		let D0 = hi - lo, kc = Math.round(bin((lo + hi) / 2)), wc = 2 * Math.PI * kc / Nfft
		let K = Math.ceil(bin(2 * D0)) + 2, M = pow2(2 * K + 1), D = Nfft / M
		let { H, half } = kernel(1.5 * D0, D0, fs, Nfft, K)
		let zr = new Float64Array(M), zi = new Float64Array(M)
		for (let j = -K; j <= K; j++) {
			let k = ((kc + j) % Nfft + Nfft) % Nfft, m = (j + M) % M, hj = H[Math.abs(j)]
			zr[m] = re[k] * hj; zi[m] = im[k] * hj
		}
		cifft(zr, zi)
		let m0 = Math.ceil((half + g0) / D), m1 = Math.floor((N - 1 - half) / D)
		if (m1 - m0 + 1 < 12) continue

		// band noise in z: PSD peak Pn·Nfft/(N·M) per sample (Parseval through the kernel and the
		// 1/M inverse FFT)
		let sig2 = Pn[b] * Nfft / (N * M)

		for (let l of pencil(zr, zi, m0, m1, sig2)) {
			let a = -Math.log(Math.hypot(l[0], l[1])) / D, w = Math.atan2(l[1], l[0]) / D + wc
			let f = w * fs / (2 * Math.PI)
			// in this band's own part, or just past it (a mode on an edge is seen from both sides; the
			// more central estimate is kept); not faded 40 dB before the band's first clean sample
			// (its amplitude would be extrapolated past what was seen); not growing
			let c = Math.abs(f - (lo + hi) / 2) / (hi - lo) * 2
			if (c <= 1.25 && f >= bands[0].lo && f < bands[bands.length - 1].hi && a * (half + g0) <= Math.log(100) && a > -LN1000 / (TMAX * fs)) poles.push({ a, w, c, b })
		}
	}
	return poles
}

// matrix pencil on z[m0..m1]: eigenvectors of the Hankel Gram H[j][k] = Σ z[i+j]·conj(z[i+k])
// span the Vandermonde vectors of the poles; the shift between their first and last L rows has
// the poles as eigenvalues. sig2: noise variance per sample at its spectral peak.
function pencil (zr, zi, m0, m1, sig2) {
	// a short pencil first; a band holding more than a third of its length in components is
	// solved again at full length (the cost grows as L³)
	let Nd = m1 - m0 + 1, full = Math.max(2, Math.min(LMAX, Math.floor(Nd / 3))), L, n, M, V
	for (L of new Set([Math.min(LSHORT, full), full])) {
		n = L + 1
		let R = Nd - L, Pr = Array.from({ length: n }, () => new Float64Array(n)), Pi = Array.from({ length: n }, () => new Float64Array(n))
		// first row directly, then down the diagonals: H[j+1][k+1] = H[j][k] − z[j]z̄[k] + z[j+R]z̄[k+R]
		for (let k = 0; k < n; k++) {
			let sr = 0, si = 0
			for (let i = 0; i < R; i++) {
				let ar = zr[m0 + i], ai = zi[m0 + i], br = zr[m0 + i + k], bi = zi[m0 + i + k]
				sr += ar * br + ai * bi; si += ai * br - ar * bi
			}
			Pr[0][k] = sr; Pi[0][k] = si
		}
		for (let j = 0; j + 1 < n; j++) for (let k = j; k + 1 < n; k++) {
			let a = m0 + j, b = m0 + k, c = m0 + j + R, d = m0 + k + R
			Pr[j + 1][k + 1] = Pr[j][k] - (zr[a] * zr[b] + zi[a] * zi[b]) + (zr[c] * zr[d] + zi[c] * zi[d])
			Pi[j + 1][k + 1] = Pi[j][k] - (zi[a] * zr[b] - zr[a] * zi[b]) + (zi[c] * zr[d] - zr[c] * zi[d])
		}
		// Hermitian P + iQ as the real symmetric [[P, −Q], [Q, P]]: eigenvalues doubled, a vector
		// [u; v] is the complex eigenvector u + iv
		let S = Array.from({ length: 2 * n }, () => new Float64Array(2 * n))
		for (let j = 0; j < n; j++) for (let k = j; k < n; k++) {
			let p = Pr[j][k], q = j === k ? 0 : Pi[j][k]
			S[j][k] = S[k][j] = S[j + n][k + n] = S[k + n][j + n] = p
			S[j + n][k] = S[k][j + n] = q; S[k + n][j] = S[j][k + n] = -q // Q[k][j] = −Q[j][k]
		}
		let eig = symeig(S), e = Array.from(eig.d).reverse().filter((_, i) => !(i & 1))
		let thr = Math.max(e[0] * RELTOL, NOISE * R * sig2 * (1 + Math.sqrt(n / R)) ** 2)
		M = Math.min(e.filter(v => v > thr).length, Math.floor(L / 2)); V = eig.V
		if (3 * M <= L) break
	}
	if (!M) return []

	// complex basis of the signal subspace from the top 2M real vectors, Gram–Schmidt
	let W = []
	for (let c = 2 * n - 1; c >= 0 && W.length < M; c--) {
		let ur = new Float64Array(n), ui = new Float64Array(n)
		for (let j = 0; j < n; j++) { ur[j] = V[j][c]; ui[j] = V[j + n][c] }
		for (let [br, bi] of W) {
			let pr = 0, pi = 0 // ⟨b, u⟩ = Σ conj(b)·u
			for (let j = 0; j < n; j++) { pr += br[j] * ur[j] + bi[j] * ui[j]; pi += br[j] * ui[j] - bi[j] * ur[j] }
			for (let j = 0; j < n; j++) { ur[j] -= pr * br[j] - pi * bi[j]; ui[j] -= pr * bi[j] + pi * br[j] }
		}
		let nn = 0
		for (let j = 0; j < n; j++) nn += ur[j] * ur[j] + ui[j] * ui[j]
		if (nn < 0.5) continue
		nn = Math.sqrt(nn)
		for (let j = 0; j < n; j++) { ur[j] /= nn; ui[j] /= nn }
		W.push([ur, ui])
	}
	M = W.length

	// Z = (W1ᴴW1)⁻¹ W1ᴴW2, W1 = rows 0..L−1, W2 = rows 1..L
	let Ar = new Float64Array(M * M), Ai = new Float64Array(M * M), Br = new Float64Array(M * M), Bi = new Float64Array(M * M)
	for (let p = 0; p < M; p++) for (let q = 0; q < M; q++) {
		let [pr, pi] = W[p], [qr, qi] = W[q], ar = 0, ai = 0, br = 0, bi = 0
		for (let j = 0; j < L; j++) {
			ar += pr[j] * qr[j] + pi[j] * qi[j]; ai += pr[j] * qi[j] - pi[j] * qr[j]
			br += pr[j] * qr[j + 1] + pi[j] * qi[j + 1]; bi += pr[j] * qi[j + 1] - pi[j] * qr[j + 1]
		}
		Ar[p * M + q] = ar; Ai[p * M + q] = ai; Br[p * M + q] = br; Bi[p * M + q] = bi
	}
	let [Zr, Zi] = csolve(Ar, Ai, Br, Bi, M)
	return ceig(Zr, Zi, M)
}

// One mode, one pole. A mode near a band edge is seen by both bands: two estimates within half a
// bin of the strike's length (|Δp|·N < π) are one, and the estimate from the band it sits more
// centrally in is kept. And two poles whose exponentials correlate over 0.95 across the strike
// (closer than a third of their half-power bandwidth) cannot be told apart: least squares gives
// them large gains of opposite sign that cancel only when played in exactly this phase; one is
// kept. A 1 Hz pair ringing 1 s correlates 0.91 and stays two.
const RHO = 0.95
function dedup (poles, N) {
	const corr = (p, q) => {
		if (Math.abs(p.w - q.w) > 20 * (p.a + q.a) + 4 * Math.PI / N) return 0 // too far apart to matter
		let [cr, ci] = geo(-p.a - q.a, p.w - q.w, N)
		return Math.hypot(cr, ci) / Math.sqrt(geo(-2 * p.a, 0, N)[0] * geo(-2 * q.a, 0, N)[0])
	}
	let out = []
	for (let p of [...poles].sort((p, q) => p.c - q.c)) if (!out.some(q => (q.b !== p.b && Math.hypot(p.w - q.w, p.a - q.a) * N < Math.PI) || corr(p, q) > RHO)) out.push(p)
	return out.map(({ a, w }) => ({ a, w }))
}

// least squares of s on e^{−αn}cos(ωn), e^{−αn}sin(ωn) for every pole; Gram entries are geometric
// sums S(q) = Σ e^{qn} = expm1(Nq)/expm1(q). Returns C = a − ib per pole (mode = Re(C·e^{pn})) and
// each mode's energy Σ|mode|² ≈ |C|²/2·Σe^{−2αn}.
function amplitudes (s, poles) {
	let N = s.length, K = poles.length, n2 = 2 * K, S = (qr, qi) => geo(qr, qi, N)
	let G = Array.from({ length: n2 }, () => new Float64Array(n2))
	for (let j = 0; j < K; j++) for (let k = j; k < K; k++) {
		let pj = poles[j], pk = poles[k]
		let [sr, si] = S(-pj.a - pk.a, pj.w + pk.w), [tr, ti] = S(-pj.a - pk.a, pj.w - pk.w)
		let cc = (sr + tr) / 2, ss = (tr - sr) / 2, cs = (si - ti) / 2, sc = (si + ti) / 2
		G[2 * j][2 * k] = G[2 * k][2 * j] = cc
		G[2 * j + 1][2 * k + 1] = G[2 * k + 1][2 * j + 1] = ss
		G[2 * j][2 * k + 1] = G[2 * k + 1][2 * j] = cs
		G[2 * j + 1][2 * k] = G[2 * k][2 * j + 1] = sc
	}
	let b = new Float64Array(n2)
	for (let k = 0; k < K; k++) {
		let { a, w } = poles[k], cr = 0, ci = 0, er = Math.exp(-a) * Math.cos(w), ei = Math.exp(-a) * Math.sin(w), ur = 1, ui = 0
		for (let n = 0; n < N; n++) {
			if (!(n & 1023)) { let m = Math.exp(-a * n); ur = m * Math.cos(w * n); ui = m * Math.sin(w * n) }
			cr += s[n] * ur; ci += s[n] * ui
			let t = ur * er - ui * ei; ui = ur * ei + ui * er; ur = t
		}
		b[2 * k] = cr; b[2 * k + 1] = ci
	}
	let x = cholsolve(G, b)
	let amps = poles.map((_, k) => [x[2 * k], -x[2 * k + 1]])
	let energy = poles.map((p, k) => (amps[k][0] ** 2 + amps[k][1] ** 2) / 2 * S(-2 * p.a, 0)[0])
	return { amps, energy }
}

// complex Σ_{n<N} e^{(qr+iqi)n} = expm1(Nq)/expm1(q)
function geo (qr, qi, N) {
	if (Math.hypot(qr, qi) < 1e-14) return [N, 0]
	let [nr, ni] = cexpm1(N * qr, N * qi), [dr, di] = cexpm1(qr, qi), dd = dr * dr + di * di
	return [(nr * dr + ni * di) / dd, (ni * dr - nr * di) / dd]
}

function cexpm1 (a, b) {
	let ea = Math.exp(a), sb = Math.sin(b / 2)
	return [Math.expm1(a) * Math.cos(b) - 2 * sb * sb, ea * Math.sin(b)]
}

// Cholesky solve of a symmetric positive (semi)definite system, a ridge added when it is singular
function cholsolve (G, b) {
	let n = b.length, ridge = 0, top = 0
	for (let i = 0; i < n; i++) top = Math.max(top, G[i][i])
	for (let tries = 0; tries < 8; tries++) {
		let L = G.map(r => Float64Array.from(r)), ok = true
		for (let i = 0; i < n && ok; i++) {
			L[i][i] += ridge
			for (let j = 0; j <= i; j++) {
				let v = L[i][j]
				for (let k = 0; k < j; k++) v -= L[i][k] * L[j][k]
				if (i === j) { if (!(v > 0)) { ok = false; break } L[i][i] = Math.sqrt(v) }
				else L[i][j] = v / L[j][j]
			}
		}
		if (ok) {
			let y = new Float64Array(n)
			for (let i = 0; i < n; i++) { let v = b[i]; for (let k = 0; k < i; k++) v -= L[i][k] * y[k]; y[i] = v / L[i][i] }
			for (let i = n - 1; i >= 0; i--) { let v = y[i]; for (let k = i + 1; k < n; k++) v -= L[k][i] * y[k]; y[i] = v / L[i][i] }
			return y
		}
		ridge = ridge ? ridge * 100 : top * 1e-12
	}
	throw new Error('modal-fit: singular amplitude system')
}

// complex A·X = B, A and B M×M row-major; Gaussian elimination with partial pivoting
function csolve (Ar, Ai, Br, Bi, M) {
	Ar = Float64Array.from(Ar); Ai = Float64Array.from(Ai); Br = Float64Array.from(Br); Bi = Float64Array.from(Bi)
	for (let c = 0; c < M; c++) {
		let p = c
		for (let r = c + 1; r < M; r++) if (Math.hypot(Ar[r * M + c], Ai[r * M + c]) > Math.hypot(Ar[p * M + c], Ai[p * M + c])) p = r
		if (p !== c) for (let k = 0; k < M; k++) {
			for (let X of [Ar, Ai, Br, Bi]) { let t = X[c * M + k]; X[c * M + k] = X[p * M + k]; X[p * M + k] = t }
		}
		let dr = Ar[c * M + c], di = Ai[c * M + c], dd = dr * dr + di * di || 1e-300
		for (let r = 0; r < M; r++) {
			if (r === c) continue
			let nr = Ar[r * M + c], ni = Ai[r * M + c]
			let fr = (nr * dr + ni * di) / dd, fi = (ni * dr - nr * di) / dd // f = A[r][c] / A[c][c]
			for (let k = 0; k < M; k++) {
				Ar[r * M + k] -= fr * Ar[c * M + k] - fi * Ai[c * M + k]; Ai[r * M + k] -= fr * Ai[c * M + k] + fi * Ar[c * M + k]
				Br[r * M + k] -= fr * Br[c * M + k] - fi * Bi[c * M + k]; Bi[r * M + k] -= fr * Bi[c * M + k] + fi * Br[c * M + k]
			}
		}
	}
	for (let r = 0; r < M; r++) {
		let dr = Ar[r * M + r], di = Ai[r * M + r], dd = dr * dr + di * di || 1e-300
		for (let k = 0; k < M; k++) {
			let xr = Br[r * M + k], xi = Bi[r * M + k]
			Br[r * M + k] = (xr * dr + xi * di) / dd; Bi[r * M + k] = (xi * dr - xr * di) / dd
		}
	}
	return [Br, Bi]
}

// eigenvalues of a complex M×M matrix (row-major): Householder to Hessenberg, then shifted QR
// with Givens rotations and Wilkinson shifts (Wilkinson 1965)
function ceig (Ar, Ai, n) {
	let Hr = Array.from({ length: n }, (_, i) => Float64Array.from(Ar.subarray(i * n, i * n + n)))
	let Hi = Array.from({ length: n }, (_, i) => Float64Array.from(Ai.subarray(i * n, i * n + n)))
	for (let k = 0; k + 2 < n; k++) {
		let norm = 0
		for (let i = k + 1; i < n; i++) norm += Hr[i][k] ** 2 + Hi[i][k] ** 2
		norm = Math.sqrt(norm)
		if (!norm) continue
		let x0r = Hr[k + 1][k], x0i = Hi[k + 1][k], ax = Math.hypot(x0r, x0i), phr = ax ? x0r / ax : 1, phi = ax ? x0i / ax : 0
		let vr = new Float64Array(n), vi = new Float64Array(n)
		vr[k + 1] = x0r + phr * norm; vi[k + 1] = x0i + phi * norm
		for (let i = k + 2; i < n; i++) { vr[i] = Hr[i][k]; vi[i] = Hi[i][k] }
		let vv = 0
		for (let i = k + 1; i < n; i++) vv += vr[i] ** 2 + vi[i] ** 2
		let f = 2 / vv
		for (let j = 0; j < n; j++) { // H ← (I − f v vᴴ) H
			let sr = 0, si = 0
			for (let i = k + 1; i < n; i++) { sr += vr[i] * Hr[i][j] + vi[i] * Hi[i][j]; si += vr[i] * Hi[i][j] - vi[i] * Hr[i][j] }
			sr *= f; si *= f
			for (let i = k + 1; i < n; i++) { Hr[i][j] -= vr[i] * sr - vi[i] * si; Hi[i][j] -= vr[i] * si + vi[i] * sr }
		}
		for (let i = 0; i < n; i++) { // H ← H (I − f v vᴴ)
			let sr = 0, si = 0
			for (let j = k + 1; j < n; j++) { sr += Hr[i][j] * vr[j] - Hi[i][j] * vi[j]; si += Hr[i][j] * vi[j] + Hi[i][j] * vr[j] }
			sr *= f; si *= f
			for (let j = k + 1; j < n; j++) { Hr[i][j] -= sr * vr[j] + si * vi[j]; Hi[i][j] -= si * vr[j] - sr * vi[j] }
		}
		for (let i = k + 2; i < n; i++) Hr[i][k] = Hi[i][k] = 0
	}
	let out = [], hi = n - 1, iter = 0
	const abs = (i, j) => Math.hypot(Hr[i][j], Hi[i][j])
	let cs = new Float64Array(n), snr = new Float64Array(n), sni = new Float64Array(n)
	while (hi >= 0) {
		if (hi === 0) { out.push([Hr[0][0], Hi[0][0]]); break }
		let l = hi
		for (; l > 0; l--) if (abs(l, l - 1) <= 2.2e-16 * (abs(l, l) + abs(l - 1, l - 1))) { Hr[l][l - 1] = Hi[l][l - 1] = 0; break }
		if (l === hi) { out.push([Hr[hi][hi], Hi[hi][hi]]); hi--; iter = 0; continue }
		if (++iter > 300) throw new Error('modal-fit: QR did not converge')
		// Wilkinson shift: the eigenvalue of the trailing 2×2 nearer its corner
		let ar = Hr[hi - 1][hi - 1], ai = Hi[hi - 1][hi - 1], br = Hr[hi - 1][hi], bi = Hi[hi - 1][hi]
		let cr = Hr[hi][hi - 1], ci = Hi[hi][hi - 1], dr = Hr[hi][hi], di = Hi[hi][hi]
		let hr = (ar - dr) / 2, hj = (ai - di) / 2
		let qr = hr * hr - hj * hj + br * cr - bi * ci, qi = 2 * hr * hj + br * ci + bi * cr
		let rm = Math.sqrt(Math.hypot(qr, qi)), ra = Math.atan2(qi, qr) / 2, sr = rm * Math.cos(ra), si = rm * Math.sin(ra)
		let m1r = (ar + dr) / 2 + sr, m1i = (ai + di) / 2 + si, m2r = (ar + dr) / 2 - sr, m2i = (ai + di) / 2 - si
		let mur, mui
		if (Math.hypot(m1r - dr, m1i - di) < Math.hypot(m2r - dr, m2i - di)) { mur = m1r; mui = m1i } else { mur = m2r; mui = m2i }
		if (iter % 11 === 10) { mur = dr + abs(hi, hi - 1); mui = di } // exceptional shift
		for (let k = l; k <= hi; k++) { Hr[k][k] -= mur; Hi[k][k] -= mui }
		for (let k = l; k < hi; k++) { // G_k zeroes H[k+1][k]; rows k, k+1
			let xr = Hr[k][k], xi = Hi[k][k], yr = Hr[k + 1][k], yi = Hi[k + 1][k]
			let ax = Math.hypot(xr, xi), r = Math.hypot(ax, Math.hypot(yr, yi)), c, s1r, s1i
			if (!r) { c = 1; s1r = s1i = 0 }
			else if (!ax) { c = 0; s1r = yr / r; s1i = -yi / r }
			else { c = ax / r; let ur = xr / ax, ui = xi / ax; s1r = (ur * yr + ui * yi) / r; s1i = (ui * yr - ur * yi) / r } // s = (x/|x|)·ȳ/r
			cs[k] = c; snr[k] = s1r; sni[k] = s1i
			for (let j = k; j <= hi; j++) {
				let pr = Hr[k][j], pi = Hi[k][j], tr = Hr[k + 1][j], ti = Hi[k + 1][j]
				Hr[k][j] = c * pr + s1r * tr - s1i * ti; Hi[k][j] = c * pi + s1r * ti + s1i * tr
				Hr[k + 1][j] = -(s1r * pr + s1i * pi) + c * tr; Hi[k + 1][j] = -(s1r * pi - s1i * pr) + c * ti // −s̄·p + c·t
			}
		}
		for (let k = l; k < hi; k++) { // H ← H·G_kᴴ: columns k, k+1
			let c = cs[k], s1r = snr[k], s1i = sni[k]
			for (let i = l; i <= Math.min(k + 2, hi); i++) {
				let pr = Hr[i][k], pi = Hi[i][k], tr = Hr[i][k + 1], ti = Hi[i][k + 1]
				Hr[i][k] = c * pr + s1r * tr + s1i * ti; Hi[i][k] = c * pi + s1r * ti - s1i * tr // c·p + s̄·t
				Hr[i][k + 1] = -(s1r * pr - s1i * pi) + c * tr; Hi[i][k + 1] = -(s1r * pi + s1i * pr) + c * ti // −s·p + c·t
			}
		}
		for (let k = l; k <= hi; k++) { Hr[k][k] += mur; Hi[k][k] += mui }
	}
	return out
}

// symmetric eigenproblem: Householder tridiagonalization and QL with implicit shifts (JAMA's
// tred2/tql2, after EISPACK). Returns ascending eigenvalues d and eigenvectors as columns of V.
function symeig (A) {
	let n = A.length, V = A.map(r => Float64Array.from(r)), d = new Float64Array(n), e = new Float64Array(n)
	for (let j = 0; j < n; j++) d[j] = V[n - 1][j]
	for (let i = n - 1; i > 0; i--) {
		let scale = 0, h = 0
		for (let k = 0; k < i; k++) scale += Math.abs(d[k])
		if (scale === 0) {
			e[i] = d[i - 1]
			for (let j = 0; j < i; j++) { d[j] = V[i - 1][j]; V[i][j] = 0; V[j][i] = 0 }
		} else {
			for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k] }
			let f = d[i - 1], g = Math.sqrt(h)
			if (f > 0) g = -g
			e[i] = scale * g; h -= f * g; d[i - 1] = f - g
			for (let j = 0; j < i; j++) e[j] = 0
			for (let j = 0; j < i; j++) {
				f = d[j]; V[j][i] = f; g = e[j] + V[j][j] * f
				for (let k = j + 1; k <= i - 1; k++) { g += V[k][j] * d[k]; e[k] += V[k][j] * f }
				e[j] = g
			}
			f = 0
			for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j] }
			let hh = f / (h + h)
			for (let j = 0; j < i; j++) e[j] -= hh * d[j]
			for (let j = 0; j < i; j++) {
				f = d[j]; g = e[j]
				for (let k = j; k <= i - 1; k++) V[k][j] -= f * e[k] + g * d[k]
				d[j] = V[i - 1][j]; V[i][j] = 0
			}
		}
		d[i] = h
	}
	for (let i = 0; i < n - 1; i++) {
		V[n - 1][i] = V[i][i]; V[i][i] = 1
		let h = d[i + 1]
		if (h !== 0) {
			for (let k = 0; k <= i; k++) d[k] = V[k][i + 1] / h
			for (let j = 0; j <= i; j++) {
				let g = 0
				for (let k = 0; k <= i; k++) g += V[k][i + 1] * V[k][j]
				for (let k = 0; k <= i; k++) V[k][j] -= g * d[k]
			}
		}
		for (let k = 0; k <= i; k++) V[k][i + 1] = 0
	}
	for (let j = 0; j < n; j++) { d[j] = V[n - 1][j]; V[n - 1][j] = 0 }
	V[n - 1][n - 1] = 1; e[0] = 0

	for (let i = 1; i < n; i++) e[i - 1] = e[i]
	e[n - 1] = 0
	let f = 0, tst1 = 0, eps = 2 ** -52
	for (let l = 0; l < n; l++) {
		tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]))
		let m = l
		while (m < n && Math.abs(e[m]) > eps * tst1) m++
		if (m > l) {
			do {
				let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = Math.hypot(p, 1)
				if (p < 0) r = -r
				d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r)
				let dl1 = d[l + 1], h = g - d[l]
				for (let i = l + 2; i < n; i++) d[i] -= h
				f += h
				p = d[m]
				let c = 1, c2 = 1, c3 = 1, el1 = e[l + 1], s = 0, s2 = 0
				for (let i = m - 1; i >= l; i--) {
					c3 = c2; c2 = c; s2 = s
					g = c * e[i]; h = c * p; r = Math.hypot(p, e[i])
					e[i + 1] = s * r; s = e[i] / r; c = p / r
					p = c * d[i] - s * g; d[i + 1] = h + s * (c * g + s * d[i])
					for (let k = 0; k < n; k++) { h = V[k][i + 1]; V[k][i + 1] = s * V[k][i] + c * h; V[k][i] = c * V[k][i] - s * h }
				}
				p = -s * s2 * c3 * el1 * e[l] / dl1; e[l] = s * p; d[l] = c * p
			} while (Math.abs(e[l]) > eps * tst1)
		}
		d[l] += f; e[l] = 0
	}
	for (let i = 0; i < n - 1; i++) {
		let k = i, p = d[i]
		for (let j = i + 1; j < n; j++) if (d[j] < p) { k = j; p = d[j] }
		if (k !== i) { d[k] = d[i]; d[i] = p; for (let j = 0; j < n; j++) { let t = V[j][i]; V[j][i] = V[j][k]; V[j][k] = t } }
	}
	return { d, V }
}
