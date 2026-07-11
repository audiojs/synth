# @audio/synth-poly [![npm](https://img.shields.io/npm/v/@audio/synth-poly)](https://www.npmjs.com/package/@audio/synth-poly) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

N-voice allocator — oldest-note steal with 5 ms fade, {freq|midi} notes, any pitched generator as voice

```
npm install @audio/synth-poly
```

```js
import poly from '@audio/synth-poly'
```

Polyphonic voice allocator: renders a list of note events through any voice function with N-voice polyphony and oldest-note stealing (5 ms fade at the steal point, no click). The voice contract is the family's generator shape — `(freq, {fs, duration, velocity, ...voiceOpts}) => Float32Array` — every pitched `@audio/synth` generator satisfies it (`osc`, `pluck`, `fm`, `modal`, `drum`'s `membrane`/`metal`, `bell`, `epiano`, `risset`, `wavetable`…). Extra per-voice config (fm's `ratio`/`index`, modal's `model`, wavetable's `tables`) rides in via `voiceOpts`.

```js
import osc from '@audio/synth-osc'
poly([{ time: 0, freq: 440, duration: 0.5 }, { time: 0.2, midi: 64 }], { voice: osc, voices: 8 })
```

| Param | Default | |
|---|---|---|
| `notes` | — | `[{time, freq\|midi, duration=0.5, velocity=1}]` (positional) |
| `voice` | — | Required — `(freq, opts) => Float32Array` voice function |
| `voiceOpts` | `{}` | Extra options forwarded to every voice call |
| `voices` | `16` | Max simultaneous notes — oldest is stolen with a 5ms fade |
| `duration` | — | Total seconds; default: end of last note + 0.5 |
| `fs` | `44100` | Sample rate |

**Use when:** hosting any pitched generator polyphonically, or rendering MIDI: `poly(parse(smf).notes, { voice: pluck })` — see [`@audio/midi`](https://github.com/audiojs/midi).

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
