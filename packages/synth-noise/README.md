# @audio/synth-noise [![npm](https://img.shields.io/npm/v/@audio/synth-noise)](https://www.npmjs.com/package/@audio/synth-noise) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Colors of noise — white/pink/brown/blue/violet, seeded, slope-verified; (duration, opts) seconds; pinkNoise filter kernel as named export

```
npm install @audio/synth-noise
```

```js
import noise, { white, pink, brown, blue, violet, pinkNoise } from '@audio/synth-noise'
```

Seeded, deterministic noise-color generators with defined spectral slopes: white 0 dB/oct, pink -3 (Kellet filter), brown -6 (leaky integration), blue +3 (differentiated pink), violet +6 (differentiated white). Unpitched — `(duration, opts)` in seconds, the family convention every generator follows.

```js
noise(1, { color: 'pink', seed: 1 })   // → Float32Array
pink(1, { seed: 1 })                    // same, direct
```

| Param | Default | Applies to | |
|---|---|---|---|
| `duration` | `1` | all | Seconds (positional) |
| `color` | `'white'` | `noise()` only | `'white'` \| `'pink'` \| `'brown'` \| `'blue'` \| `'violet'` |
| `seed` | `1` | all | PRNG seed |
| `leak` | `0.999` | `brown` only | Integrator leak coefficient |
| `fs` | `44100` | all | Sample rate |

`pinkNoise` (from `./pink-noise.js`) is the underlying Kellet-filter kernel, exported directly for use outside the color generators.

**Use when:** dither, masking noise, testing filters/denoisers against known spectral slopes.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
