# @audio/synth-lfo [![npm](https://img.shields.io/npm/v/@audio/synth-lfo)](https://www.npmjs.com/package/@audio/synth-lfo) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Low-frequency oscillator (modulation source)

```
npm install @audio/synth-lfo
```

```js
import lfo from '@audio/synth-lfo'
```

Low-frequency control-rate generator — sine/triangle/square/saw, bipolar (-1..1) or unipolar (0..1). A modulation source, not an audio-rate processor — no `audio.js` manifest (hosts drive param modulation directly; an LFO-as-atom would be redundant with a host's own modulation routing).

```js
lfo(2, { type: 'triangle', unipolar: true })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `freq` | `2` | Hz (positional) |
| `duration` | `1` | Seconds |
| `type` | `'sine'` | `'sine'` \| `'triangle'` \| `'square'` \| `'saw'` |
| `unipolar` | `false` | `false` → -1..1, `true` → 0..1 |
| `phase` | `0` | Starting phase, 0..1 |
| `fs` | `44100` | Sample rate |

**Use when:** rendering a modulation curve to multiply/add onto a param, offline (for a host with live modulation routing, drive the param directly instead).

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
