# @audio/synth-risset [![npm](https://img.shields.io/npm/v/@audio/synth-risset)](https://www.npmjs.com/package/@audio/synth-risset) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Risset drum (inharmonic bell-drum)

```
npm install @audio/synth-risset
```

```js
import risset from '@audio/synth-risset'
```

Risset drum: a fixed set of five inharmonic partials plus a sub-sine an octave below with slower decay, a simplified take on Risset's classic bell-drum catalogue. Amplitude-normalized to `amp` at the peak. Pitched — `(freq, opts)`.

```js
risset(100, { duration: 1.2 })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `freq` | — | Hz (positional) |
| `duration` | `1.2` | Seconds |
| `amp` | `0.6` | Peak amplitude (post-normalization) |
| `fs` | `44100` | Sample rate |

**Use when:** a cheap inharmonic drum/bell hybrid distinct from the literature-grounded [`synth-modal`](https://github.com/audiojs/synth/tree/main/packages/synth-modal).

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
