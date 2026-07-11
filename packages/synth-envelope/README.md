# @audio/synth-envelope [![npm](https://img.shields.io/npm/v/@audio/synth-envelope)](https://www.npmjs.com/package/@audio/synth-envelope) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

ADSR contour generator (one-shot, known length)

```
npm install @audio/synth-envelope
```

```js
import adsr from '@audio/synth-envelope'
```

ADSR gain-contour generator — attack/decay linear, sustain flat, release exponential-ish. Returns a `Float32Array` contour to multiply onto any source (gain, filter cutoff, amplitude); one-shot, whole envelope rendered up front (known total length, unlike a gate-driven realtime ADSR).

```js
adsr({ attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3, duration: 1 })
```

| Param | Default | |
|---|---|---|
| `attack` | `0.01` | Seconds |
| `decay` | `0.1` | Seconds |
| `sustain` | `0.7` | Sustain level, 0..1 |
| `release` | `0.3` | Seconds |
| `duration` | `1` | Note-on length, seconds (release starts here) |
| `fs` | `44100` | Sample rate |

**Use when:** shaping any generator's amplitude or a filter cutoff — used internally by [`synth-voice`](https://github.com/audiojs/synth/tree/main/packages/synth-voice).

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
