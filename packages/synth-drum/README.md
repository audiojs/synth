# @audio/synth-drum [![npm](https://img.shields.io/npm/v/@audio/synth-drum)](https://www.npmjs.com/package/@audio/synth-drum) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Membrane (pitch-drop kick) / metal (inharmonic cymbal) / noiseDrum (snare/hat)

```
npm install @audio/synth-drum
```

```js
import membrane, { metal, noiseDrum } from '@audio/synth-drum'
```

Three drum-synthesis kernels, the Tone.js MembraneSynth/MetalSynth/NoiseSynth class: `membrane` is a sine whose pitch drops exponentially (kick), `metal` sums six inharmonic square-ish partials (cymbal — classic FM-bell ratio set), `noiseDrum` is decaying seeded band noise (snare/hat). `membrane` and `metal` are pitched — `(freq, opts)`; `noiseDrum` is unpitched — `(opts)`.

```js
membrane(55, { drop: 3, duration: 0.5 })    // kick
metal(200, { duration: 0.6 })               // cymbal
noiseDrum({ duration: 0.25, seed: 9 })      // snare/hat
```

| Param | Default | Applies to | |
|---|---|---|---|
| `freq` | `55` / `200` | membrane / metal | Hz (positional) |
| `drop` | `3` | membrane | pitch-drop multiplier |
| `duration` | `0.5` / `0.6` / `0.25` | all | seconds |
| `amp` | `0.9` / `0.5` / `0.7` | all | peak amplitude |
| `seed` | `9` | noiseDrum | PRNG seed |
| `fs` | `44100` | all | sample rate |

**Use when:** synthetic drum hits — `membrane` for kicks, `metal` for cymbals/bells, `noiseDrum` for snare/hat layers.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
