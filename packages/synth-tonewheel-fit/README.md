# @audio/synth-tonewheel-fit [![npm](https://img.shields.io/npm/v/@audio/synth-tonewheel-fit)](https://www.npmjs.com/package/@audio/synth-tonewheel-fit) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Tonewheel registration from audio: a sustained organ note or chord → nine drawbars 0..8, percussion, scanner setting and a score

```
npm install @audio/synth-tonewheel-fit
```

```js
import fit from '@audio/synth-tonewheel-fit'
```

The inverse of [`synth-tonewheel`](https://github.com/audiojs/synth/tree/main/packages/synth-tonewheel). The keys fix which tonewheels can sound; each wheel's amplitude is tracked in its own band of a Hann STFT, reaching halfway to the neighbouring wheel and at most ±1.5 semitones, wide enough to hold the scanner's and a Leslie's frequency modulation. Nonnegative least squares against the organ model (a wheel carries the drawbars of every key that taps it) gives the nine levels, reweighted toward relative error because rooms and cabinets scale each partial; the levels then snap to the drawbar law in dB. Percussion hypotheses, 4' or 2⅔' at fast or slow decay, add a decaying column and drop the 1'. The scanner setting is read from how much of each wheel's energy stays in its carrier line: vibrato keeps sinc²(πfD) of it, chorus adds the undelayed half back.

```js
let r = fit(audio, { freq: 261.63 })   // freq: [..] for a chord; omit it for one key
r.drawbars     // '888000000'
r.percussion   // null | { harmonic: 'third', decay: 'fast', volume: 'normal' }
r.vibrato      // null | 'v1' … 'c3'
r.score        // 0..1
r.levels       // fitted levels before rounding, 1 = drawbar at 8
r.keys         // MIDI keys analyzed
```

| Param | Default | |
|---|---|---|
| `data` | | Organ audio, mono or channels (positional); channel powers add, so a two-mic Leslie avoids the comb of a summed pair |
| `freq` | estimated | Hz of the key at 8', or Hz[] of a chord; one key is estimated when omitted |
| `amp` | unknown | The render's `amp`, when known: absolute levels. Otherwise the loudest drawbar is 8 |
| `vibrato` | `'auto'` | The scanner setting when known, `false` for none; `'auto'` reads it from ≥ 0.7 s of held note |
| `fs` | `44100` | Sample rate |

**Levels are relative.** A registration and the same one a few steps quieter differ only in gain, so without `amp` the fit returns the canonical form, loudest drawbar at 8, at the gain that puts every level closest to a tap.<br>
**The key.** Without `freq`, the key is the pitch heard: of the keys whose wheels hold the spectrum, the lowest whose 8' sounds. `888000000` on C4 reads as `008880000` on C3, the same three wheels; pass `freq` to keep the organist's key. Chords need `freq`.<br>
**Foldback.** Where two drawbars of a key reach one wheel, only their sum is audible; the level goes to the unfolded drawbar first.<br>
**Scanner.** A Leslie on tremolo reads as vibrato: its rotor turns at 6.7 Hz, the scanner at 6.87 Hz. Vibrato changes no level, so the drawbars are unaffected.<br>
**Score.** The share of the note's spectrum inside the wheel bands, times the share of the wheel tracks the rounded registration explains: 1.000 for the organ, 0.997 through reverb, 0.92 for a sawtooth (its 7th and 9th harmonics fall outside), 0.72 for the DX7's E.PIANO 1, 0.04 for white noise. It measures fit, not identity: any harmonic sound scores high.

**Measured**: random registrations on keys C3–C5, 1.5 s notes, 100 per row, `node packages/synth-tonewheel-fit/bench.js` from the family root:

| Condition | Exact | Every drawbar ±1 |
|---|---|---|
| dry; vibrato V1–V3; chorus C1–C3, setting read | 100% | 100% |
| dry, gain known, any registration | 100% | |
| major triads, dry | 100% | 100% |
| Leslie chorale, two mics ([`effect-rotary`](https://github.com/audiojs/effect/tree/main/packages/effect-rotary)) | 87% | 100% |
| Leslie tremolo, two mics | 80% | 100% |
| Leslie chorale, one mic | 9% | 95% |
| Leslie chorale, both mics summed to mono | 0% | 9% |
| reverb, [`reverb-freeverb`](https://github.com/audiojs/reverb/tree/main/packages/reverb-freeverb) defaults (mix 0.33) | 20% | 93% |
| reverb, mix 0.15 | 89% | 100% |
| major triads, reverb mix 0.33 | 34% | 100% |

The misses come from the effects, which color each partial by more than the ±1.5 dB between drawbar steps: the Leslie's crossover costs one mic up to 2 dB near 800 Hz, summing its two mics combs the horn band by up to 4.5 dB, and a room gives every steady partial its own ±1.7 dB. More keys average the room out; two mics beat one. A fit takes about 45 ms of CPU for a 1.5 s note.

**Use when:** naming the registration of a Hammond in a recording (the first rung of synth recognition), or checking a rendered registration.<br>
**Not for:** the pedals or the lower manual, keys held with different registrations at once, or proving that a sound is a Hammond (see Score).

## References

- C. L. Lawson, R. J. Hanson, *Solving Least Squares Problems*, Prentice-Hall, 1974, ch. 23: the NNLS active-set algorithm.
- Hammond Organ Company, *Hammond Organ Service Manual*, early models: Table III (keys to wheels) and "The Hammond Vibrato" (412 rpm scanner, about 1.5% shift at V3), via `synth-tonewheel`.
- L. Hammond, US Patent 1,956,350 (1934), p. 12: the matching-transformer taps behind the drawbar law.

---

Part of [@audio/synth](https://github.com/audiojs/synth), the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
