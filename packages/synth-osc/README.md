# @audio/synth-osc [![npm](https://img.shields.io/npm/v/@audio/synth-osc)](https://www.npmjs.com/package/@audio/synth-osc) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Oscillator — periodic-function waveforms (sine/square/saw/triangle), detune, custom wave fn

```
npm install @audio/synth-osc
```

```js
import osc from '@audio/synth-osc'
```

Classic waveform oscillator rendered from [`periodic-function`](https://www.npmjs.com/package/periodic-function), with cents detune and phase offset. Pitched — `(freq, opts)`, the family generator contract.

```js
osc(440, { type: 'sawtooth', detune: -5 })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `freq` | — | Hz (positional) |
| `duration` | `1` | Seconds |
| `type` | `'sine'` | `'sine'` \| `'square'` \| `'sawtooth'` \| `'triangle'` |
| `amp` | `0.8` | Peak amplitude |
| `detune` | `0` | Cents |
| `phase` | `0` | Starting phase, 0..1 |
| `wave` | — | Custom waveform fn `t => v`, overrides `type` |
| `fs` | `44100` | Sample rate |

**Use when:** the base oscillator under [`synth-voice`](https://github.com/audiojs/synth/tree/main/packages/synth-voice) and [`synth-poly`](https://github.com/audiojs/synth/tree/main/packages/synth-poly), or any test tone with a classic waveform.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
