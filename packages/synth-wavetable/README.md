# @audio/synth-wavetable [![npm](https://img.shields.io/npm/v/@audio/synth-wavetable)](https://www.npmjs.com/package/@audio/synth-wavetable) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Wavetable oscillator with table morphing (tables required)

```
npm install @audio/synth-wavetable
```

```js
import wavetable from '@audio/synth-wavetable'
```

Morphing wavetable oscillator (WaveEdit class): scans a position 0..1 through a bank of single-cycle tables, crossfading between adjacent tables and interpolating within each. `tables` is a required asset argument (array of single-cycle `Float32Array`s) — no default set is bundled, and there's no `audio.js` manifest since arrays have no params representation for a host; use the kernel directly. Pitched — `(freq, opts)`.

```js
wavetable(220, { tables: [sine, saw, square], position: t => t })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `freq` | — | Hz (positional) |
| `tables` | — | Required — `Float32Array[]`, single-cycle waveforms |
| `position` | `0` | 0..1, or a function `progress => position` |
| `duration` | `1` | Seconds |
| `amp` | `0.8` | Peak amplitude |
| `fs` | `44100` | Sample rate |

**Use when:** morphing timbres over the course of a note — feed it your own table bank (e.g. rendered from `synth-osc` waveforms, samples, or additive synthesis).

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
