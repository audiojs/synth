# @audio/synth-pluck [![npm](https://img.shields.io/npm/v/@audio/synth-pluck)](https://www.npmjs.com/package/@audio/synth-pluck) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Karplus-Strong plucked string

```
npm install @audio/synth-pluck
```

```js
import pluck from '@audio/synth-pluck'
```

Karplus-Strong plucked string (Karplus & Strong 1983): a seeded noise burst circulates through an averaging delay loop sized to the pitch period, decaying via the loop's damping factor. Pitched — `(freq, opts)`.

```js
pluck(220, { damp: 0.996, duration: 1.5 })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `freq` | — | Hz (positional) — sets the delay-loop length |
| `duration` | `1` | Seconds |
| `amp` | `0.7` | Noise-burst amplitude |
| `damp` | `0.996` | Loop damping — closer to 1 decays slower |
| `seed` | `1` | PRNG seed for the excitation burst |
| `fs` | `44100` | Sample rate |

**Use when:** plucked-string/guitar-like tones without a physical model; cheap and classic.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
