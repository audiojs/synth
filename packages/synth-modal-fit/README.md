# @audio/synth-modal-fit [![npm](https://img.shields.io/npm/v/@audio/synth-modal-fit)](https://www.npmjs.com/package/@audio/synth-modal-fit) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Modal snapshot from audio: one strike of a bell, cymbal or drum → [`synth-modal`](https://github.com/audiojs/synth/tree/main/packages/synth-modal)'s `{ freq, amp, modes: [{ ratio, gain, t60 }] }`

```
npm install @audio/synth-modal-fit
```

```js
import fit from '@audio/synth-modal-fit'
import modal from '@audio/synth-modal'

let s = fit(strike)   // { freq, amp, modes: [{ ratio, gain, t60 }] }, plain JSON
modal(s.freq, s)      // plays it back
```

The inverse of `synth-modal`. A struck object rings as a sum of decaying sinusoids that all start at the strike. The strike's spectrum is cut into overlapping bands (200 Hz wide up to 2 kHz, a tenth of the frequency above), each taken to complex baseband through a Kaiser-windowed lowpass; a finite kernel keeps every pole, so each band is again a sum of the same damped exponentials. The matrix pencil (Hua & Sarkar 1990) finds them, the order set by the Hankel eigenvalues standing above the band's noise, which minimum statistics read from between the modes. It resolves modes closer than an FFT bin as long as the strike outlasts their beat. Amplitudes come from one least-squares fit over every pole, the Gram matrix in closed form, so overlapping modes share energy correctly. synth-modal starts every mode in sine phase at one instant, so a gain's sign is the only phase a snapshot has: the strike instant is the one within 1 ms of the onset that brings the modes closest to sine phase, and the signs are chosen together to minimize the squared error to the strike.

| Param | Default | |
|---|---|---|
| `data` | | One strike, from shortly before its onset to before the next; mono, or channels (mixed) (positional) |
| `fs` | `44100` | Sample rate |
| `freq` | the mode with the most energy | Hz of ratio 1 |
| `nmodes` | all | Keep at most this many modes, strongest by energy |
| `floor` | `-80` | Drop modes whose energy after the excitation falls this many dB under the strike's |

**Levels.** The mode with the most energy has ratio 1 and gain 1; `amp` is the sum of the modes' amplitudes, which synth-modal divides back out of gains summing past 1, so every mode rings at its measured amplitude.<br>
**Peak.** Levels are measured, peaks are not: synth-modal starts every mode in sine phase at one sample, so a clash the recording spreads over its first milliseconds can play as one click over the recording's peak. On the karatala strikes the snapshot peaks 4.4 dB over the recording (median; 16 dB at most) for 0.3 ms (1.2 ms at most), while its RMS stays within 1 dB of the recording's; the click comes from the short poles of the clash (t60 under 50 ms: 16.5 dBFS alone on the worst strike, the rest 6.6 dBFS). Bells, finger cymbals, ghanta, tabla and mridanga play a median 0.7–4.9 dB under their recordings' peaks (one bell strike 10.7 dB over). Scaling `amp` down to the recording's peak would leave the whole ring 4.4 dB (up to 16 dB) too quiet to tame a click of a millisecond, so `amp` stays measured. Where the output must not pass full scale, scale at the call site and accept the quieter ring (`peak` the largest absolute sample): `modal(s.freq, { ...s, amp: s.amp * Math.min(1, peak(strike) / peak(modal(s.freq, s))) })`.<br>
**Excitation.** Poles are told apart from 5 ms after the onset: a pole that carries no energy after that only fitted the mallet's contact or the clash, and is dropped. Amplitudes are fitted from the onset, the attack included.<br>
**Phase.** A gain's sign is the only phase a snapshot has, and the modes are meant to start in synth-modal's sine phase at the strike. Overlapping poles that model a recorded clash partly cancel there: on the karatala the modes' energies sum to up to 5 dB over the energy of their render, on a mridanga stroke 7 dB. A player that starts partials in another phase (cosine, random) makes such an attack louder.<br>
**Exact on synth-modal.** A synth-modal render returns as itself: the test suite renders custom modes, a 1/2/5 Hz pair set and a named bar with negative gains, and gets every frequency, t60, amplitude and sign back to 1e-4 cents and 1e-3 dB; the snapshot replays the render to 100 dB under its peak.

**Measured**, `node packages/synth-modal-fit/bench.js` from the family root. The bench was frozen in git before the fit was tuned (commits 0254de1, d084e73).

Synthetic: synth-modal renders, 2 s, 10 per row, gains −30..0 dB with random sign, t60 0.05–10 s (pairs 1–10 s), white noise N dB under the first 50 ms. Without noise every row is exact (95th percentile ≤ 0.01 cents, ≤ 0.02% t60, ≤ 0.01 dB, nothing missed or spurious), except amplitudes under a 5 ms noise-burst excitation (below). 95th percentiles:

| Row | −40 dB: cents | t60 | amp | missed | −20 dB: cents | t60 | amp | missed |
|---|---|---|---|---|---|---|---|---|
| harmonic 8 | 0.53 | 4.9% | 0.24 dB | 3/80 | 1.1 | 22% | 1.2 dB | 31/80 |
| free-free bar 6 | 0.20 | 2.2% | 0.09 dB | 5/60 | 6.0 | 13% | 0.6 dB | 21/60 |
| circular membrane 8 | 5.0 | 27% | 1.5 dB | 8/80 | 11 | 87% | 3.2 dB | 32/80 |
| free plate 5 | 0.63 | 3.0% | 0.73 dB | 2/50 | 1.3 | 23% | 1.3 dB | 20/50 |
| pairs split by 1, 2, 5, 10 Hz | 0.18 | 37% | 2.2 dB | 6/80 | 3.6 | 2051% | 16 dB | 30/80 |
| 24 dense modes | 1.3 | 18% | 0.96 dB | 38/240 | 18 | 65% | 8.8 dB | 141/240 |
| bar 6, 5 ms noise burst | 0.53 | 3.1% | 6.0 dB | 4/60 | 0.73 | 8.3% | 3.6 dB | 23/60 |

Misses at −20 dB are modes under the noise: weak, short, or both. Spurious modes (within 60 dB of the strike's energy): none without noise, at most 3 per row at −40 dB, 10 at −20 dB; signs 100% right at −40 dB. A burst-excited strike's amplitudes carry the burst (median 0.38 dB, 95th percentile 7.5 dB without noise). A fit takes 0.1–0.2 s of CPU for 2 s of audio and a few dozen modes; a recorded bell strike with some 350 modes about 1 s.

Recordings: strikes cut from free recordings, each fitted and re-rendered, scored by [`neural-synth`](https://github.com/audiojs/neural)'s multi-scale spectral distance (FFT 2048/512/128, DDSP's loss) after level matching and onset alignment. The threshold is the noise floor of the task: a strike's floor is its distance to the nearest other strike of the same instrument, T the median floor; a strike passes under its own floor, an instrument when its median re-render scores under T.
v1 (frozen with the fit) compares with a common floor 60 dB under the strike, so a recording's steady background (room, microphone, MP3), shared by the next strike and missing from every snapshot, counted against the snapshot. v2 (bench commit d4bf8a7, fixed before any v2 score) floors every spectrogram cell of both signals at the reference strike's own background (minimum statistics, Martin 2001; 3× its mean power, which a noise cell stays under 95% of the time), and scores T and the re-render alike. Checked on known input first: a render against itself with a background scores 2.588 under v1 and 0.051 under v2, another background 0.100 and 0.054.

| Instrument | Strikes | v1 T | v1 re-render | v1 | v2 T | v2 re-render | Strikes under their floor | v2 |
|---|---|---|---|---|---|---|---|---|
| karatala | 11 | 2.682 | 3.678 | fail | 2.581 | 2.487 | 8 | **pass** |
| finger cymbals | 12 | 1.576 | 5.061 | fail | 1.145 | 1.641 | 4 | fail |
| tingsha | 1 | – | 1.710 | no floor | – | 1.438 | – | no floor |
| bell, 15 cm | 13 | 2.340 | 3.265 | fail | 2.277 | 2.599 | 4 | fail |
| ghanta | 9 | 2.260 | 7.707 | fail | 1.592 | 1.758 | 4 | fail |
| tabla, da | 10 | 1.561 | 4.140 | fail | 1.456 | 1.934 | 1 | fail |
| mridanga | 24 | 1.909 | 6.664 | fail | 1.389 | 1.815 | 3 | fail |

Held-out (v2 bench, listed in git before the fit ran on them): new recordings and the mridanga strikes past the 24 the bench takes from its file, each strike's floor read within its own recording session. No second recording of the bench's karatala pair exists on Freesound or Wikimedia Commons, so the karatala's held-out strikes are other pairs of small hand cymbals; no clean second tingsha was found.

| Instrument | Session | Strikes | T | Re-render | Strikes under their floor | Verdict |
|---|---|---|---|---|---|---|
| karatala's kind | hand cymbals, Japan | 24 | 2.774 | 3.507 | 1 | fail |
| | zill 7 cm, Nepal | 24 | 0.925 | 1.568 | 6 | fail |
| | manjira | 1 | – | 1.804 | – | no floor |
| finger cymbals | Zildjian | 15 | 1.465 | 1.330 | 10 | pass |
| | thatjeffcarter | 6 | 2.334 | 2.828 | 3 | fail |
| | Sabian | 1 | – | 3.670 | – | no floor |
| bell | rin | 2 | 3.505 | 5.217 | 1 | fail |
| | miniature bell | 9 | 2.239 | 2.519 | 5 | fail |
| ghanta | drilbu | 2 | 6.337 | 2.176 | 2 | pass (2 strikes) |
| tabla, da | Da_Test01 | 1 | 1.675 | 1.878 | 0 | fail |
| mridanga | Tishra, strikes 25–48 | 24 | 1.398 | 2.121 | 1 | fail |
| | Khanda | 24 | 1.603 | 2.255 | 3 | fail |

The karatala passes on its own strikes, narrowly (2.487 against 2.581), and fails on other pairs. What is lost, measured on 12 strikes of the Japanese pair (snapshot 3.184 against T 2.774): playing every pole in its measured phase instead of sine phase gives 3.060; the recording's own first 30 ms, 2.718; on the bench's karatala the measured phases alone take 2.487 to 1.722. Most of the residual lies 1–16 kHz in the first 300 ms, where the snapshot plays 6–11 dB under the recording above 8 kHz, and above 8 kHz the pencil's order reaches its cap of 32 components on most bands. Raising the order where it does (halving a crowded band, or a pencil twice as long) brings the measured-phase model to 2.917 or 2.795 but not the snapshot, 3.376 or 2.995: more short poles in sine phase cost as much as they add, and the longer pencil takes 4.5× the time. What would close the gap is a player that keeps each mode's phase, not a different fit. The zill's floor is low because the onset rule cuts a ringing roll into fragments that resemble their neighbours.

Sources (downloaded and checked by SHA-256 on first run, never bundled; Freesound files are its 128 kb/s MP3 previews):
karatala: [YNDkaratalas01](https://freesound.org/s/128676/), [YNDkaratalas02](https://freesound.org/s/128675/) by yasodanandana, CC BY 3.0.
finger cymbals: [Finger cymbals.WAV](https://freesound.org/s/439616/) by Luc Henrion, CC0.
tingsha: [Tingsha Cymbal](https://freesound.org/s/435074/) by steffcaffrey, CC0.
bell: [Striking a bell 15cm large](https://commons.wikimedia.org/wiki/File:Striking_a_bell_15cm_large.ogg) by stephan, public domain.
ghanta: [Ghanta-Leather-Mallet-2015-05-16](https://freesound.org/s/274316/) by the_very_Real_Horst, CC0.
tabla: Da_Test02–11 by subodh3012 (Freesound [345573](https://freesound.org/s/345573/)–345582 and [420858](https://freesound.org/s/420858/)), CC0.
mridanga: [Mridangam-Tishra](https://freesound.org/s/176272/) by ajaysm, CC0.<br>
Held-out: hand cymbals: [Japan_Asian_Hand_Cymbals_Improv](https://freesound.org/s/365414/) by RutgerMuller, CC0; [Audio Zill small 1](https://commons.wikimedia.org/wiki/File:Audio_Zill_small_1.mp3) and [2](https://commons.wikimedia.org/wiki/File:Audio_Zill_small_2.mp3) by Hadi, CC0; [ornamental manjeera](https://freesound.org/s/418152/) by johnnyguitar01, CC0.
finger cymbals: [finger cymbals](https://freesound.org/s/626655/) by peter_fedak, CC BY 4.0; [finger cymbal](https://freesound.org/s/146070/) by thatjeffcarter, CC BY 4.0; [Finger cymbals](https://commons.wikimedia.org/wiki/File:Finger_cymbals.ogg) by Why? I Ask, CC BY-SA 4.0.
bell: [Japanese rin played as struck idiophone](https://commons.wikimedia.org/wiki/File:Japanese_rin_played_as_struck_idiophone.ogg) by MichaelMaggs, CC BY-SA 4.0; [Sonido de campana miniatura 1](https://commons.wikimedia.org/wiki/File:Sonido_de_campana_miniatura_1.wav) by Luis Alvaz, CC BY-SA 4.0.
ghanta: [01drilbu](https://freesound.org/s/516574/) by tenzin64, CC0. tabla: [Da_Test01](https://freesound.org/s/345576/) by subodh3012, CC0. mridanga: [Mridangam-Khanda](https://freesound.org/s/176276/) by ajaysm, CC0.

**Use when:** turning a recorded strike into an editable, transposable modal patch (ratios and decays to edit, a pitch to move; `nmodes` to keep it small); recovering the modes of a synth-modal render.<br>
**Not for:** a recording's background or the clash itself (not modal), sustained or bowed sounds, two strikes at once, or partials whose pitch glides (they come back as clusters of fixed modes).

## References

- Y. Hua, T. K. Sarkar, "Matrix pencil method for estimating parameters of exponentially damped/undamped sinusoids in noise", *IEEE Trans. ASSP* 38(5), 1990.
- J. Laroche, "The use of the matrix pencil method for the spectrum analysis of musical signals", *JASA* 94(4), 1993.
- D. B. Percival, A. T. Walden, *Spectral Analysis for Physical Applications*, Cambridge, 1993: a periodogram cell of noise is chi-square with 2 degrees of freedom (bench v2's floor).
- R. Martin, "Noise power spectral density estimation based on optimal smoothing and minimum statistics", *IEEE Trans. Speech Audio Proc.* 9(5), 2001.
- F. J. Harris, "On the use of windows for harmonic analysis with the discrete Fourier transform", *Proc. IEEE* 66(1), 1978.
- J. F. Kaiser, "Nonrecursive digital filter design using the I0-sinh window function", *Proc. IEEE ISCAS*, 1974.
- J. Engel, L. Hantrakul, C. Gu, A. Roberts, "DDSP: Differentiable Digital Signal Processing", ICLR 2020: the multi-scale spectral loss.
- N. H. Fletcher, T. D. Rossing, *The Physics of Musical Instruments*, 2nd ed., Springer, 1998: the bar, membrane and plate tables of the bench, via `synth-modal`.

---

Part of [@audio/synth](https://github.com/audiojs/synth), the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
