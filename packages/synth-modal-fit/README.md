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

Recordings: strikes cut from free recordings, each fitted and re-rendered, scored by D, [`neural-synth`](https://github.com/audiojs/neural)'s multi-scale spectral distance (FFT 2048/512/128, DDSP's loss) after level matching, onset alignment and a floor 60 dB under the strike. The threshold is the noise floor of the task: a strike's floor is its D to the nearest other strike of the same instrument, T the median floor; a strike passes under its own floor, an instrument when its median re-render scores under T.

| Instrument | Strikes | T | Re-render, median | Strikes passing | Modes | Verdict | With the strike's own background (diagnostic) |
|---|---|---|---|---|---|---|---|
| karatala | 11 | 2.682 | 3.678 | 1 | 271 | fail | 2.657 |
| finger cymbals | 12 | 1.576 | 5.061 | 1 | 22 | fail | 3.112 |
| tingsha | 1 | – | 1.710 | – | 144 | no floor | |
| bell, 15 cm | 13 | 2.340 | 3.265 | 2 | 353 | fail | 2.771 |
| ghanta | 9 | 2.260 | 7.707 | 1 | 10 | fail | 3.703 |
| tabla, da | 10 | 1.561 | 4.140 | 0 | 106 | fail | 2.325 |
| mridanga | 24 | 1.909 | 6.664 | 0 | 122 | fail | 2.590 |

No instrument passes. Most of the gap is not modal: every strike carries its recording's background (room, microphone, MP3), steady under the strike some 40 dB down, in bands where the instrument has no mode; another strike carries the same background, a snapshot cannot. Adding to each re-render a stationary noise shaped like its own strike's background (minimum statistics, not the recorded noise) brings the karatala to 2.657, at its threshold of 2.682, and closes over half the gap for every instrument; that noise alone scores 11.2 on the karatala, and the strongest mode with it 6.85. The other instruments stay over T even then; what remains includes partials that drift by a few hertz over a strike (measured on the karatala; a fixed mode cannot follow), strokes that overlap the last one's ring (mridanga), and short strikes whose noise is read from few frames.

Sources (downloaded and checked by SHA-256 on first run, never bundled; Freesound files are its 128 kb/s MP3 previews):
karatala: [YNDkaratalas01](https://freesound.org/s/128676/), [YNDkaratalas02](https://freesound.org/s/128675/) by yasodanandana, CC BY 3.0.
finger cymbals: [Finger cymbals.WAV](https://freesound.org/s/439616/) by Luc Henrion, CC0.
tingsha: [Tingsha Cymbal](https://freesound.org/s/435074/) by steffcaffrey, CC0.
bell: [Striking a bell 15cm large](https://commons.wikimedia.org/wiki/File:Striking_a_bell_15cm_large.ogg) by stephan, public domain.
ghanta: [Ghanta-Leather-Mallet-2015-05-16](https://freesound.org/s/274316/) by the_very_Real_Horst, CC0.
tabla: Da_Test02–11 by subodh3012 (Freesound [345573](https://freesound.org/s/345573/)–345582 and [420858](https://freesound.org/s/420858/)), CC0.
mridanga: [Mridangam-Tishra](https://freesound.org/s/176272/) by ajaysm, CC0.

**Use when:** turning a recorded strike into an editable, transposable modal patch (ratios and decays to edit, a pitch to move; `nmodes` to keep it small); recovering the modes of a synth-modal render.<br>
**Not for:** a recording's background or the clash itself (not modal), sustained or bowed sounds, two strikes at once, or partials whose pitch glides (they come back as clusters of fixed modes).

## References

- Y. Hua, T. K. Sarkar, "Matrix pencil method for estimating parameters of exponentially damped/undamped sinusoids in noise", *IEEE Trans. ASSP* 38(5), 1990.
- J. Laroche, "The use of the matrix pencil method for the spectrum analysis of musical signals", *JASA* 94(4), 1993.
- R. Martin, "Noise power spectral density estimation based on optimal smoothing and minimum statistics", *IEEE Trans. Speech Audio Proc.* 9(5), 2001.
- F. J. Harris, "On the use of windows for harmonic analysis with the discrete Fourier transform", *Proc. IEEE* 66(1), 1978.
- J. F. Kaiser, "Nonrecursive digital filter design using the I0-sinh window function", *Proc. IEEE ISCAS*, 1974.
- J. Engel, L. Hantrakul, C. Gu, A. Roberts, "DDSP: Differentiable Digital Signal Processing", ICLR 2020: the multi-scale spectral loss.
- N. H. Fletcher, T. D. Rossing, *The Physics of Musical Instruments*, 2nd ed., Springer, 1998: the bar, membrane and plate tables of the bench, via `synth-modal`.

---

Part of [@audio/synth](https://github.com/audiojs/synth), the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
