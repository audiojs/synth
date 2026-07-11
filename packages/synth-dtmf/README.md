# @audio/synth-dtmf [![npm](https://img.shields.io/npm/v/@audio/synth-dtmf)](https://www.npmjs.com/package/@audio/synth-dtmf) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

DTMF tone pairs (Q.23 frequencies)

```
npm install @audio/synth-dtmf
```

```js
import dtmf from '@audio/synth-dtmf'
```

Dual-tone multi-frequency signaling — one row + one column sine per digit, ITU-T Q.23 frequencies, with inter-digit silence gaps. Symbolic digit-string input — no `audio.js` manifest (a digit string has no params representation for a host).

```js
dtmf('12*3', { tone: 0.08, gap: 0.04 })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `digits` | — | String of `0-9 A-D * #` (positional) |
| `tone` | `0.08` | Per-digit tone length, seconds |
| `gap` | `0.04` | Inter-digit silence, seconds |
| `amp` | `0.45` | Amplitude (each of the two sines) |
| `fs` | `44100` | Sample rate |

**Use when:** rendering telephone keypad tones for testing DTMF decoders or IVR-style demos.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
