# @audio/synth-voice [![npm](https://img.shields.io/npm/v/@audio/synth-voice)](https://www.npmjs.com/package/@audio/synth-voice) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Osc + envelope voice (Tone.js Synth class)

```
npm install @audio/synth-voice
```

```js
import voice from '@audio/synth-voice'
```

Composed voice — [`synth-osc`](https://github.com/audiojs/synth/tree/main/packages/synth-osc) through a one-pole lowpass whose cutoff is scaled by an [`synth-envelope`](https://github.com/audiojs/synth/tree/main/packages/synth-envelope) ADSR, the Tone.js Synth/MonoSynth class. Pitched — `(freq, opts)`.

```js
voice(440, { type: 'sawtooth', cutoff: 3000, envAmount: 0.6 })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `freq` | — | Hz (positional) |
| `fs` | `44100` | Sample rate |
| `type` | `'sawtooth'` | Oscillator waveform — see `synth-osc` |
| `duration` | `0.6` | Note-on length, seconds |
| `attack` / `decay` / `sustain` / `release` | `0.01` / `0.15` / `0.6` / `0.25` | ADSR, seconds/level |
| `cutoff` | `3000` | Lowpass cutoff at full envelope, Hz |
| `envAmount` | `0.6` | 0..1 — how much the envelope scales the cutoff |
| `amp` | `0.7` | Peak amplitude |

**Use when:** a ready-made subtractive voice for `synth-poly`, without composing osc+envelope+filter by hand.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
