# @audio/synth

Try it in the browser: [Room and speaker measurement](https://audiojs.dev/util/measure/). Runs on this package, nothing is uploaded.

> Synthesis & signal generators — test tones, noise colors, classic synthesis atoms.

**Generator contract** (family convention): every *pitched* generator is `(freq, opts) → Float32Array` — `osc`, `pluck`, `voice`, `risset`, `lfo`, `wavetable`, `fm` (+ `bell`, `epiano`), `modal`, `membrane`, `metal`, `tonewheel` (also Hz[] for a chord, or a note list), `dx7`. Unpitched generators take a single opts-or-scalar form: `noise(duration, opts)`, `chirp(opts)`, `rhythm(opts)`, `adsr(opts)`, `sfx(preset | opts)`, `dtmf(digits, opts)`. Durations are **seconds**; sample rate is `fs` (default 44100); output is mono `Float32Array`. `poly(notes, { voice, voiceOpts })` hosts any pitched generator as a voice — per-voice config (fm's `ratio`/`index`, modal's `model`, wavetable's `tables`) rides in via `voiceOpts`.

| Package | Status | What |
|---|---|---|
| `@audio/synth-noise` | ✔ | colors of noise — white/pink/brown/blue/violet, seeded, slope-verified; `(duration, opts)` seconds; `pinkNoise` filter kernel as named export |
| `@audio/synth-osc` | ✔ | oscillator — band-limited sine/square/saw/triangle (64-tap BLEP: aliases under −94 dB below 16 kHz), detune, custom wave fn |
| `@audio/synth-chirp` | ✔ | frequency sweep — exp/linear |
| `@audio/synth-dtmf` | ✔ | DTMF tone pairs (Q.23 frequencies) |
| `@audio/synth-pluck` | ✔ | Karplus-Strong plucked string |
| `@audio/synth-risset` | ✔ | Risset drum (inharmonic bell-drum) |
| `@audio/synth-rhythm` | ✔ | grid-timed pattern renderer (metronome/click track) |
| `@audio/synth-envelope` | ✔ | ADSR contour generator (one-shot, known length) |
| `@audio/synth-lfo` | ✔ | low-frequency oscillator (modulation source) |
| `@audio/synth-voice` | ✔ | osc + envelope voice (Tone.js Synth class) |
| `@audio/synth-drum` | ✔ | membrane (pitch-drop kick) / metal (inharmonic cymbal) / noiseDrum (snare/hat) |
| `@audio/synth-fm` | ✔ | FM (phase modulation) — Chowning 1973, single-op or serial `ops` stack, per-op feedback + index decay; `bell`/`epiano` presets; FFT sidebands match Bessel J_k to 0.00% |
| `@audio/synth-modal` | ✔ | modal synthesis — impulse-invariant resonator bank; F&R-cited bar/membrane/plate/tube/stiff-string tables, strike-position weighting, per-mode T60 |
| `@audio/synth-modal-fit` | ✔ | modal snapshot from audio: one strike → synth-modal's `{ freq, amp, modes: [{ ratio, gain, t60 }] }` by subband matrix pencil and joint least squares; a synth-modal render returns as itself |
| `@audio/synth-poly` | ✔ | N-voice allocator — oldest-note steal with 5 ms fade, `{freq\|midi}` notes, any pitched generator as voice |
| `@audio/synth-sfx` | ✔ | ZZFX-class parameterized SFX, 8 deterministic presets |
| `@audio/synth-wavetable` | ✔ | wavetable oscillator with table morphing (`tables` required) |
| `@audio/synth-tonewheel` | ✔ | tonewheel organ (Hammond B-3 upper manual): 91 geared wheels, drawbar taps per US 1,956,350, service-manual foldback, single-trigger percussion, key click, 412 rpm vibrato/chorus scanner |
| `@audio/synth-tonewheel-fit` | ✔ | registration from audio: NNLS on tonewheel-band tracks → nine drawbars 0..8, percussion and scanner setting, score; `888000000` returns as itself |
| `@audio/synth-dx7` | ✔ | Yamaha DX7 FM engine: bit-exact port of the Music Synthesizer for Android core (Apache-2.0), 32 algorithms, DX7 EGs on the DX7 clock, LFO, pitch EG, VMEM/VCED sysex |

**audio.js manifests**: 14/20 atoms ship one (hostable by [`audio`](https://github.com/audiojs/audio) / [`@audio/compile-wam`](https://github.com/audiojs/compile/tree/main/packages/compile-wam)). Exempt with reasons: `synth-dtmf` (symbolic digit-string input has no params representation), `synth-lfo` (modulation source, not an audio-rate processor for hosts), `synth-wavetable` (`tables` is an asset argument — arrays have no params representation; use the kernel directly), `synth-dx7` (`patch` is a 155-byte voice asset, no params representation), `synth-tonewheel-fit` (analysis: returns a registration, not audio), `synth-modal-fit` (analysis: returns modes, not audio).

Parity targets: Audacity generators, Tone.js synthesis primitives. `pink-noise` extracted from audio-filter; musical test synths also live in `beat/synth.js` + `beat/floatbeats.js` (future `floatbeats` fixtures package).

MIDI rendering: `poly(parse(smf).notes, { voice: pluck })` — see [`@audio/midi`](https://github.com/audiojs/midi).
