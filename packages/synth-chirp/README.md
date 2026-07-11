# @audio/synth-chirp [![npm](https://img.shields.io/npm/v/@audio/synth-chirp)](https://www.npmjs.com/package/@audio/synth-chirp) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Frequency sweep — exp/linear

```
npm install @audio/synth-chirp
```

```js
import chirp from '@audio/synth-chirp'
```

Frequency sweep generator. Exponential (log) sweep is the ESS measurement signal (Farina 2000, used by [`@audio/measure-ir`](https://github.com/audiojs/measure-ir)); linear sweep is for response plots. Instantaneous frequency: linear `f(t) = f0 + (f1-f0)·t/T`, exponential `f(t) = f0·(f1/f0)^(t/T)`. Unpitched — single opts argument, edges fade to avoid clicks.

```js
chirp({ f0: 20, f1: 20000, duration: 1, method: 'exp' })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `f0` | `20` | Start frequency, Hz |
| `f1` | `fs/2 · 0.95` | End frequency, Hz |
| `duration` | `1` | Seconds |
| `method` | `'exp'` | `'exp'` or `'lin'` |
| `amp` | `0.9` | Peak amplitude |
| `fade` | `0.005` | Edge fade, seconds (anti-click) |
| `fs` | `44100` | Sample rate |

**Use when:** measuring an impulse response (ESS deconvolution) or sweeping a filter/effect for a Bode-style plot.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
