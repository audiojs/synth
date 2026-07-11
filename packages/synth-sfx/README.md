# @audio/synth-sfx [![npm](https://img.shields.io/npm/v/@audio/synth-sfx)](https://www.npmjs.com/package/@audio/synth-sfx) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

ZZFX-class parameterized SFX, 8 deterministic presets

```
npm install @audio/synth-sfx
```

```js
import sfx, { PRESETS } from '@audio/synth-sfx'
```

Game/UI sound-effect generator (ZZFX/sfxr class): one parameterized pipeline — shaped oscillator → frequency slide/vibrato/arpeggio → ADSR-ish envelope → optional lowpass/bitcrush — behind 8 named presets covering the sfxr archetypes (`pickup`, `laser`, `explosion`, `powerup`, `hit`, `jump`, `blip`, `coin`). Every field is overridable; noise is seeded, so renders are reproducible.

```js
sfx('laser')                          // named preset
sfx('coin', { seed: 42 })             // preset + override
sfx({ freq: 500, shape: 'square' })   // full custom parameter object
```

| Param | Default | |
|---|---|---|
| `preset` | `'blip'` | Preset name or full parameter object (positional) |
| `freq` | preset | Base frequency, Hz |
| `shape` | preset | `'sine'` \| `'square'` \| `'saw'` \| `'triangle'` \| `'noise'` |
| `slide` | `0` | Octaves/second exponential pitch slide |
| `vibrato` / `vibratoDepth` | `0` / `0.1` | Hz / depth |
| `arp` / `arpAt` | `0` / `0.05` | Frequency multiplier stepped at `arpAt` seconds |
| `attack` / `sustain` / `release` | `0.005` / `0.08` / `0.12` | Seconds |
| `lowpass` | `0` | One-pole lowpass cutoff, Hz (0 = off) |
| `crush` | `0` | 0..1 bitcrush amount |
| `amp` | `0.8` | Peak amplitude |
| `seed` | — | Noise PRNG seed |
| `fs` | `44100` | Sample rate |

**Use when:** deterministic game/UI SFX without shipping audio assets.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
