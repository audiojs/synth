# @audio/synth-modal [![npm](https://img.shields.io/npm/v/@audio/synth-modal)](https://www.npmjs.com/package/@audio/synth-modal) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Modal synthesis — impulse-invariant resonator bank; F&R-cited bar/membrane/plate/tube/stiff-string tables, strike-position weighting, per-mode T60

```
npm install @audio/synth-modal
```

```js
import modal from '@audio/synth-modal'
```

A bank of impulse-invariant two-pole resonators, one per vibrational mode, excited by an impulse or short noise burst (Adrien 1991, "The missing link: modal synthesis"; Cook, *Real Sound Synthesis for Interactive Applications*, ch. 5). Mode-ratio tables per model are cited from Fletcher & Rossing, *The Physics of Musical Instruments*, 2nd ed. — `string` (Fletcher 1964 stiff-string), `bar` (free-free Euler-Bernoulli), `membrane` (Bessel-zero circular membrane), `plate` (free circular plate), `tube-open`/`tube-closed` (pipe harmonics/odd-harmonics).

```js
modal(220, { model: 'string', inharmonicity: 0.0002, strike: 0.3 })
```

| Param | Default | |
|---|---|---|
| `freq` | — | Fundamental (mode 1) Hz (positional) |
| `model` | `'bar'` | `'string'` \| `'bar'` \| `'membrane'` \| `'plate'` \| `'tube-open'` \| `'tube-closed'` |
| `modes` | — | Custom `[{ratio, gain?, t60?}]` — overrides model/nmodes/inharmonicity |
| `nmodes` | `8` | Modes drawn from the model's table |
| `t60` | `2` | Fundamental decay time, seconds (-60dB) |
| `damping` | `0.7` | HF loss exponent: `t60_k = t60·(f1/fk)^damping` |
| `inharmonicity` | `0` | String-only stiffness coefficient B: `fk = k·f1·√(1+B·k²)` |
| `strike` | `0.5` | 0..1 strike/pluck position (1D models only) |
| `exciter` | `'impulse'` | `'impulse'` \| `'noise'` \| custom `Float32Array` |
| `duration` | — | Default: covers the slowest mode's T60 |
| `amp` | `0.8` | Peak amplitude |
| `seed` | `9` | Noise-exciter PRNG seed |
| `fs` | `44100` | Sample rate |

**Use when:** physically-grounded percussive/struck timbres (bars, membranes, plates, strings, tubes) with per-model literature-sourced mode ratios rather than hand-tuned partials.

---

Part of [@audio/synth](https://github.com/audiojs/synth) — the synth family umbrella.

MIT © [audiojs](https://github.com/audiojs)
