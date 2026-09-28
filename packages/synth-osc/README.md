# @audio/synth-osc [![npm](https://img.shields.io/npm/v/@audio/synth-osc)](https://www.npmjs.com/package/@audio/synth-osc) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Oscillator — band-limited sine/square/saw/triangle, detune, custom wave fn

```
npm install @audio/synth-osc
```

```js
import osc from '@audio/synth-osc'
```

Classic waveform oscillator with cents detune and phase offset, in [`periodic-function`](https://www.npmjs.com/package/periodic-function)'s phase conventions (saw falling, square high on the first half, triangle falling from its peak). Pitched — `(freq, opts)`, the family generator contract.

Square, saw and triangle are band-limited: at each jump in value (saw, square) or slope (triangle) within ±32 samples, the waveform takes the residual of a band-limited step (BLEP; Brandt 2001, Välimäki & Huovilainen 2007) or its integral (BLAMP; Esqueda et al. 2016), a 64-tap Kaiser-windowed sinc (β 10, cutoff 0.47·fs), linear phase, no latency. Measured from 55 Hz to 10 kHz at 44.1 and 48 kHz (2¹⁸-point Blackman-Harris spectra):

| | naive (1.0.x) | band-limited |
|---|---|---|
| strongest alias below 16 kHz, dB re fundamental (saw) | −54 (55 Hz) to −10 (10 kHz) | under −94 (the analysis floor) |
| strongest alias anywhere | −52 to −9 | under −75 |
| all aliased power re harmonics | −29 to −5 | −76 to −109 |
| harmonics vs the ideal, to 16 kHz | exact, plus aliases | within 0.01 dB; −0.8 dB at 0.45·fs |

`wave(type, t, dt)` gives one sample of it at phase `t` advancing `dt = f/fs` per sample, for oscillators of your own (synth-sfx sweeps its pitch through it).

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
