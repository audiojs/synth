# @audio/synth-tonewheel [![npm](https://img.shields.io/npm/v/@audio/synth-tonewheel)](https://www.npmjs.com/package/@audio/synth-tonewheel) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Tonewheel organ (Hammond B-3 upper manual): 91 geared tonewheels, nine drawbars on the matching-transformer taps, foldback, single-trigger percussion, key click, vibrato/chorus scanner

```
npm install @audio/synth-tonewheel
```

```js
import tonewheel from '@audio/synth-tonewheel'
```

A model of the instrument, not of a recording of it: every tonewheel spins at its geared speed (20 rev/s drive, one of twelve gear ratios, 2 to 192 teeth), each key taps nine wheels through its drawbars, and keys that reach the same wheel share its signal. So the quint drawbars sit up to 2.7 cents flat of true harmonics and the tierce 13–16 cents sharp, chords share wheels coherently, and the manual folds back at both ends as the service manual wires it.

```js
tonewheel(261.63, { drawbars: '888000000' })                                  // one key → Float32Array
tonewheel([261.63, 329.63, 392], { drawbars: '00 8030 000', vibrato: 'c3' })  // a chord through the chorus
tonewheel([{ time: 0, midi: 60, duration: 0.3 }, { time: 0.4, midi: 64, duration: 0.3 }],
  { drawbars: '888000000', percussion: 'third' })                            // detached keys retrigger percussion
```

| Param | Default | |
|---|---|---|
| `notes` | `261.63` | Hz of one key, Hz[] pressed together, or `[{ time, freq \| midi, duration }]` (positional); each lands on the nearest key, MIDI 36–96 |
| `drawbars` | `'888000000'` | Nine positions 0–8, panel order 16' 5⅓' 8' 4' 2⅔' 2' 1⅗' 1⅓' 1'; spaces allowed (`'88 8000 000'`), or an array |
| `duration` | `1` | Key held, seconds |
| `percussion` | `false` | `'second'` (4') or `'third'` (2⅔'), single-triggered; silences the 1' |
| `percussionDecay` | `'fast'` | `'fast'` (−60 dB in 1 s) or `'slow'` (4 s) |
| `percussionVolume` | `'normal'` | `'normal'` (cuts the organ signal) or `'soft'` (cuts the percussion) |
| `click` | `1` | Key contact: 1 switches wheels in at once (the B-3's click), 0 ramps them over 5 ms |
| `vibrato` | `false` | Scanner: `'v1'` `'v2'` `'v3'` vibrato, `'c1'` `'c2'` `'c3'` chorus |
| `amp` | `0.8` | One key with all nine drawbars at 8 peaks at most here |
| `fs` | `44100` | Sample rate |

Leslie: chain [`@audio/effect-rotary`](https://github.com/audiojs/effect/tree/main/packages/effect-rotary), mono in, stereo out.

```js
import rotary from '@audio/effect-rotary'
let organ = tonewheel(261.63, { drawbars: '888000000', duration: 2 })
let L = Float64Array.from(organ), R = Float64Array.from(organ)
rotary(L, R, { speed: 'tremolo' })
```

The model is exported for analysis: `wheelHz(w)`, `wheel(midi, drawbar)` (with foldback), `level(n)`, `TAPS`, `OFFSET`, `FOOTAGE`, `PERCUSSION`, `SCANNER`, `registration(drawbars)`. The inverse, audio to drawbars, is [`synth-tonewheel-fit`](https://github.com/audiojs/synth/tree/main/packages/synth-tonewheel-fit).

## Sources

| Constant | Value | Source |
|---|---|---|
| Drive | 1200 rpm synchronous motor on 60 Hz: 20 rev/s | Service manual §5-12 |
| Gear ratios C..B | 85/104, 71/82, 67/73, 35/36, 69/67, 12/11, 37/32, 49/40, 48/37, 11/8, 67/46, 54/35 | HammondWiki, Gear Ratio (A: 20 · 16 · 88/64 = 440 Hz); the same values in setBfree's `gears60ratios` |
| Teeth | 2, 4 … 128 by octave; wheels 85–91 (C..F#) 192 teeth on the F..B shafts, "four octaves less five semitones" above their 16-tooth partners | Service manual §5-5; HammondWiki |
| Keys, foldback | Key 1 (C2) sounds wheel 13 at 8'; the bottom octave's 16' repeats the octave above; wheels past 91 repeat an octave lower | Service manual, Table III "Frequency numbers assigned to keys and pedals" |
| Drawbar law | Taps at 6, 8, 11, 16, 22, 32, 45, 64 turns, about 3 dB a step | L. Hammond, US Patent 1,956,350 (1934), p. 12 |
| Percussion | 2nd or 3rd harmonic borrowed from its drawbar bus; single trigger; keyed by the 1' contacts; normal cuts the organ (R1), soft cuts the percussion; fast +50% output; joins after the scanner | Service manual pp. 2-36 to 2-38, §5-47 to 5-52 |
| Percussion decay | Fast about 1 s, slow about 4 s to inaudible, taken as −60 dB | Hammond-Leslie FAQ ed. 1.4.2; setBfree |
| Scanner | 412 rpm; the line swept up and back each turn; the whole line (V3) shifts pitch about 1.5%, V2 about half, V1 about a third; chorus adds undelayed signal | Service manual, "The Hammond Vibrato" |

**Unsourced, and marked so:** the percussion peak (3 × a drawbar at 8 on fast, 2 on slow per the +50%), soft (× 0.5012) and the normal organ cut (× 0.60512) are setBfree's defaults (`tonegen.c`, GPL-2.0-or-later; values only), since the service manual gives the circuit but no levels. The equal chorus mix is an assumption: the manual names a series resistor, not its ratio. Later matching transformers, the B-3's among them, changed the first three taps; their turns are unpublished, so the patent's are used. The click is modeled as instant contact closure. Not modeled: tonewheel harmonics and crosstalk, the key circuits' per-frequency taper, the percussion high-pass, the scanner line's low-pass, the lower manual and pedals.

**Use when:** Hammond tone with the instrument's own tuning, wheel sharing and foldback; rendering known registrations to analyze or match.<br>
**Not for:** a Leslie (chain `@audio/effect-rotary`) or the pedal division.

## References

- Hammond Organ Company, *Hammond Organ Service Manual*, early models A, B, C series, B-3, C-3, A-100 ([archive.org](https://archive.org/details/HammondOrganServiceManual-EarlyModelsabcSeriesB3A-100RtDG)).
- L. Hammond, [US Patent 1,956,350](https://patents.google.com/patent/US1956350A/en), "Electrical musical instrument," 1934.
- G. T. Dairiki et al., [HammondWiki: Gear Ratio](https://www.dairiki.org/HammondWiki/GearRatio).
- M. A. Mercier, B. Dodds, [The Hammond-Leslie FAQ](http://www.theatreorgans.com/hammond/faq/files/hammond-faq.pdf), ed. 1.4.2, 2000.
- F. Kilander, R. Gareus, W. Panther, [setBfree](https://github.com/pantherb/setBfree) `src/tonegen.c` (GPL-2.0-or-later): cited values only.

---

Part of [@audio/synth](https://github.com/audiojs/synth), the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
