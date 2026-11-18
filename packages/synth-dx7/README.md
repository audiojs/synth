# @audio/synth-dx7 [![npm](https://img.shields.io/npm/v/@audio/synth-dx7)](https://www.npmjs.com/package/@audio/synth-dx7) [![Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-white)](./LICENSE)

Yamaha DX7 FM engine: a bit-exact JavaScript port of the Music Synthesizer for Android core; 6 operators, 32 algorithms, DX7 envelopes, LFO, pitch EG; cartridge and voice sysex

```
npm install @audio/synth-dx7
```

```js
import dx7, { parse } from '@audio/synth-dx7'
```

The FM engine of [Music Synthesizer for Android](https://github.com/google/music-synthesizer-for-android) (MSFA, Raph Levien, Apache-2.0), the fixed-point DX7 model Dexed later forked, translated function for function: six operators through the 32 algorithms with self-feedback, the DX7 envelope with its rate and level tables, keyboard level and rate scaling, velocity sensitivity, fixed-frequency operators and detune, the LFO's six waveforms with delay, sync and pitch-mod sensitivity, and the pitch EG. Voices load from original DX7 sysex.

```js
import { readFileSync } from 'node:fs'
let voices = parse(readFileSync('cartridge.syx'))                  // [{ name, patch }] × 32
dx7(220, { patch: voices[10].patch, velocity: 0.8, duration: 1 })  // → Float32Array
dx7(440)                                                           // INIT VOICE: one sine
```

| Param | Default | |
|---|---|---|
| `freq` | `440` | Hz of the key played (positional); within a cent of a key it plays that key exactly; the voice's transpose shifts it, as on the DX7 |
| `patch` | INIT VOICE | 155-byte VCED voice, `parse(sysex)[i].patch` |
| `velocity` | `1` | 0..1, MIDI velocity / 127 |
| `duration` | `1` | Key held, seconds; key-up lands on MSFA's 64-sample block grid |
| `release` | until silent | Seconds after key-up; by default rendering stops once every carrier EG has finished and a block peaks below −102 dB, at most 10 s |
| `fs` | `44100` | Sample rate, above 16384 Hz (MSFA's frequency table overflows below) |
| `msfa` | `false` | `true`: upstream MSFA's EG timing, see Timing |

Output keeps MSFA's scale, 1.0 = its int16 full scale: one carrier at output level 99 peaks at 0.125; voices with several loud carriers exceed 1.

**Exactness.** The family `test.js` compiles the unmodified upstream core (`test/msfa-render.cc` against a checkout in `~/.cache/audiojs/data/msfa`, built for x86-64) and renders the same voice, note, velocity and length in both: all 32 algorithms with feedback 0–7; random voices over the whole parameter space at 44.1, 48 and 49.096 kHz; the six LFO waveforms with sync and delay over fixed-frequency operators with detune; every voice of the ROM1A cartridge MSFA bundles (whose voice 31 is CHIME-STRG, where Yamaha's factory ROM1A has TRAIN). The int32 outputs match bit for bit. MSFA's 64-bit products stay exact in double precision (all below 2^53; the LFO's pitch product, up to 2^63, is split in two), and the libm-derived tables are pinned, so every JS engine renders the same samples. On AArch64 upstream swaps its operator kernel for a NEON float approximation; this port follows the fixed-point path that x86-64 builds run.

**Timing.** MSFA advances the amplitude EG once per 64-sample block by DX7 steps, so its envelopes keep DX7 time only at the DX7's own 49096 Hz (MSFA wiki, Dx7Hardware) and run 10% slow at 44.1 kHz. This port scales the step by 49096/fs, which reproduces the decay rate MSFA documents, 0.2819·2^(q/4)·(1 + (q mod 4)/4) dB/s at rate step q (MSFA wiki, Dx7Envelope), at any sample rate. The pitch EG and LFO already run in seconds. `{ msfa: true }` keeps upstream's EG; at 49096 Hz the two agree bit for bit.

**Beyond upstream:** the voice's transpose is applied (MSFA ignores it); LFO phase, sample-and-hold state and feedback history start at 0 (upstream leaves them uninitialized).<br>
**Not modeled, as in upstream:** amplitude modulation (AMS, LFO AMD); oscillator key sync off (every note restarts its operators at phase 0); mod wheel, breath, foot and aftertouch routing; pitch bend (held at center); portamento; mono mode; the DX7's DAC and output filter.

**Raw engine.** `render(patch, { note, velocity (0..127), fs, duration, release, msfa })` returns whole 64-sample blocks of int32, 2^28 = full scale. `new Voice(patch, opts)` streams them: `block(out)` adds 64 samples into an `Int32Array(64)`, `keyup()` releases, `done` reports the release finished, `silent` that every carrier has settled below the gain the engine skips an operator at, so every later block adds 0. `init(patch, note, velocity)` starts another note on the same voice, allocating nothing, and it sounds as a new `Voice` would, feedback history and LFO from 0. `releaseTime(patch, { fs, msfa })` is the most seconds a note of the voice sounds after the block its key goes up before: MIDI keys 0..127 through its transpose, velocity 127, released at its envelopes' highest level; `Infinity` where a carrier's L4 holds it audible. Measured CPU real-time factor 6–7·10⁻⁴ per voice in Node on one core (Apple M4 Max): about 1500 voices in real time, or 25 hours of rendered notes per CPU-minute.

**Live instrument.** `import { dx7 } from '@audio/synth-dx7/audio'` is a processor of the audio.js contract 1.0: notes in, no input bus, the mono voice on every output channel, streaming. A 1.0 host gives it note events and it plays them as they arrive.

- Sixteen voices, the DX7's polyphony (DX7 Operating Manual, specifications; MSFA wiki Dx7Hardware, "6 operators x 16 voice polyphony"; MSFA `synth_unit.h`, `max_active_notes = 16`), made once and reused: `process` allocates nothing.
- Each note runs the engine's 64-sample blocks from its own note-on frame, so it is `Voice`'s render of that note sample for sample, from the frame it starts at, whatever the call sizes. At 49096 Hz that is upstream MSFA's.
- An off releases at its voice's next 64-sample step, at most 63 frames (1.4 ms at 44.1 kHz) after it: the engine's envelopes move once a step.
- A new note takes the voice MSFA's `SynthUnit::AllocateNote` gives: counting from the voice after the last one taken, the first whose key is up, its release cut if it still rings. With all 16 keys held MSFA drops the new note; here the oldest held note gives way instead (our choice).
- Velocity 0..1 reaches the engine as MIDI velocity `round(v·127)`: 0.5 plays as 64. A fractional `midi` plays between keys: the engine's log-frequency line runs through the fraction, level and rate scaling take the nearest key. The voice's transpose applies.
- Each note starts its own LFO, as each `Voice` does; the DX7 has one for the instrument.
- A released voice that is `silent` stops computing; its output is exactly 0 from there on.

The parameters are the voice's 145 sounding bytes in VCED order: `op6Rate1` … `op6Detune`, the same for `op5` to `op1`, then the voice's 19. Numbers step by 1; `algorithm`, `opNDetune` and `transpose` read as the DX7 displays them, the rest as the byte. Defaults are INIT VOICE (`INIT`).

| Parameter | Values |
|---|---|
| `opNRate1`–`4`, `opNLevel1`–`4` | 0..99, the operator's EG |
| `opNBreakPoint` | 0..99 (A-1..C8) |
| `opNLeftDepth`, `opNRightDepth` | 0..99 |
| `opNLeftCurve`, `opNRightCurve` | `-lin` `-exp` `+exp` `+lin` |
| `opNRateScaling`, `opNVelocitySens` | 0..7 |
| `opNAmpModSens` | 0..3, not modeled |
| `opNOutputLevel` | 0..99 |
| `opNMode` | `ratio` `fixed` |
| `opNCoarse`, `opNFine` | 0..31, 0..99 |
| `opNDetune` | −7..+7 |
| `pitchRate1`–`4`, `pitchLevel1`–`4` | 0..99, the pitch EG |
| `algorithm` | 1..32 |
| `feedback`, `pitchModSens` | 0..7 |
| `oscKeySync` | switch, not modeled |
| `lfoSpeed`, `lfoDelay`, `lfoPitchDepth` | 0..99 |
| `lfoAmpDepth` | 0..99, not modeled |
| `lfoKeySync` | switch |
| `lfoWave` | `triangle` `saw-down` `saw-up` `square` `sine` `sample-hold` |
| `transpose` | −24..+24 st, C1..C5 with C3 as 0 |

The engine reads all 145 as a note starts (MSFA `Dx7Note::init`): a value changed while notes sound applies from the next note on, and none applies at once.

`tail` is the longest a released note rings to exact silence at the values in force: `releaseTime` plus the 63 frames an off may wait, 7.2 ms for INIT VOICE at 44.1 kHz, `Infinity` when a carrier's L4 holds it audible. `latency` is 0: a note's first sample, its operators at phase 0, lands on the note's frame (measured: the INIT sine's phase is 0 there).

**Sysex.** `parse(bytes)` reads 32-voice cartridges (VMEM: F0 43 0n 09 20 00, 4104 bytes), single voices (VCED: F0 43 0n 00 01 1B, 163 bytes), any sequence of these, or headerless 4096-, 155- or 128-byte data, and returns `[{ name, patch }]`. Values beyond the documented ranges are clamped; checksums are not enforced, since many circulating cartridges carry wrong ones. A cartridge's byte count written as a plain 16-bit number (10 00) reads as 4096 like the manual's 7-bit 20 00, and other messages in a file (a DX7II performance, another maker's data) are skipped. `unpack(bulk)` converts one packed 128-byte voice, `name(patch)` reads its name, `INIT` is the DX7's initialized voice, `MAX` holds each parameter's maximum (minimum 0): the bounds for sound matching over a voice. Bytes 145–154 are the name and make no sound, so a search leaves them out:

```js
import match from '@audio/neural-synth'
let voice = p => { let patch = new Uint8Array(155); patch.set(p.map(Math.round)); return patch }
let r = match(p => dx7(220, { patch: voice(p) }), target,
  { bounds: [...MAX.subarray(0, 145)].map(m => [0, m]), seeds: [[...voices[10].patch.subarray(0, 145)]] })   // refine a recognized preset
```

**Factory voices** are not included: Yamaha's ROM cartridges circulate widely, but their redistribution terms are unclear. Load your own `.syx`.

**Use when:** rendering DX7 voices from sysex identically to MSFA: preset libraries, training data for FM sound matching, a recognized preset as the seed of [`@audio/neural-synth`](https://github.com/audiojs/neural)'s `match`; the DX7 played live in a contract 1.0 host, its voice set by parameters.<br>
**Not for:** a free-form FM operator stack (use [`synth-fm`](https://github.com/audiojs/synth/tree/main/packages/synth-fm)), or voices that depend on amplitude modulation or controller routing.

## References

- R. Levien, [Music Synthesizer for Android](https://github.com/google/music-synthesizer-for-android), `app/src/main/jni` at f67d41d (Apache-2.0); wiki pages Dx7Envelope and Dx7Hardware.
- Yamaha, *DX7 Digital Programmable Algorithm Synthesizer Operating Manual*: voice parameters, VCED and VMEM data formats, voice initialize.
- J. Chowning, "The Synthesis of Complex Audio Spectra by Means of Frequency Modulation," *JAES* 21(7), 1973.

---

Part of [@audio/synth](https://github.com/audiojs/synth), the synth family umbrella.

Apache-2.0 © 2012–2013 Google Inc. (MSFA engine), audiojs (port). See [NOTICE](./NOTICE).
