# @audio/synth-rhythm [![npm](https://img.shields.io/npm/v/@audio/synth-rhythm)](https://www.npmjs.com/package/@audio/synth-rhythm) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Grid-timed pattern renderer (metronome/click track)

```
npm install @audio/synth-rhythm
```

```js
import rhythm from '@audio/synth-rhythm'
```

Metronome/click-track generator: decaying tone bursts on a BPM grid, downbeats accented with a higher frequency and full amplitude. Unpitched — single opts argument.

```js
rhythm({ bpm: 120, bars: 4, beats: 4 })   // → Float32Array
```

| Param | Default | |
|---|---|---|
| `bpm` | `120` | Beats per minute |
| `bars` | `4` | Number of bars |
| `beats` | `4` | Beats per bar |
| `freq` | `1000` | Regular-beat click frequency, Hz |
| `accentFreq` | `1500` | Downbeat click frequency, Hz |
| `amp` | `0.7` | Downbeat amplitude (regular beats: `amp * 0.7`) |
| `fs` | `44100` | Sample rate |

**Use when:** a click track / metronome reference for tempo-synced tests or arrangement scratch tracks.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
