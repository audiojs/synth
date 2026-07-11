# @audio/synth-fm [![npm](https://img.shields.io/npm/v/@audio/synth-fm)](https://www.npmjs.com/package/@audio/synth-fm) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

FM (phase modulation) — Chowning 1973, single-op or serial ops stack, per-op feedback + index decay; bell/epiano presets; FFT sidebands match Bessel J_k to 0.00%

```
npm install @audio/synth-fm
```

```js
import fm, { bell, epiano } from '@audio/synth-fm'
```

Chowning 1973 FM synthesis ("The Synthesis of Complex Audio Spectra by Means of Frequency Modulation," JAES 21(7)), implemented as DX7-style phase modulation. Single operator by default, or a serial `ops` stack (innermost-first, each op's output phase-modulates the next, last modulates the carrier) — per-op `ratio`/`index`/`feedback`/`indexDecay`. `bell` and `epiano` are FM-classic presets built on the same kernel.

```js
fm(440, { ratio: 1.4, index: 10, indexDecay: 2 })   // → Float32Array
bell(440)                                            // Chowning's inharmonic bell/gong
epiano(440)                                          // 2-op DX7-style e-piano
```

| Param | Default | |
|---|---|---|
| `freq` | — | Carrier Hz (positional) |
| `ratio` | `2` | Modulator:carrier ratio (single-op form) |
| `index` | `5` | Peak modulation index, radians |
| `indexDecay` | `0` | Index decay time constant, seconds (0 = static) |
| `indexFloor` | `0` | Index floor after decay |
| `feedback` | `0` | Modulator self-feedback, radians |
| `ops` | — | Serial modulator stack `[{ratio, index, ...}]` — overrides the single-op params |
| `duration` | `1` | Seconds |
| `attack` / `release` | `0.005` / `0.1` | Seconds |
| `amp` | `0.8` | Peak amplitude |
| `fs` | `44100` | Sample rate |

**Use when:** classic FM timbres (bells, e-piano, brass-ish tones); `ops` for multi-operator stacks.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
