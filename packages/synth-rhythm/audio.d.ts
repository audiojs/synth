// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/plugin. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Transport = Readonly<{ playing: boolean, bpm: number, beat: number, barStart: number, timeSig: [number, number] }>
/** What a host hands a processor it builds: the contract's Context (CONTRACT.d.ts, 1.0) */
type Ctx = { readonly sampleRate: number, readonly maxBlockSize: number, readonly maxChannels: number, readonly layouts?: { readonly inputs: readonly (string | undefined)[], readonly outputs: readonly (string | undefined)[] }, readonly params: Live, readonly buffers: Readonly<Record<string, Float32Array[] | undefined>>, readonly events?: readonly { time: number, kind: 'on' | 'off', midi: number, velocity: number, id: number }[], emit(name: string, value: number): void, readonly transport: Transport }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'rhythm' */
export interface RhythmOptions {
  /** 20..300 bpm (default 120) */
  "bpm"?: Auto
  /** 1..12 (default 4) */
  "beats"?: Auto
  /** 200..4000 Hz (default 1000) */
  "freq"?: Auto
  /** 200..6000 Hz (default 1500) */
  "accentFreq"?: Auto
  /** 0..1 (default 0.7) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const rhythm: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 20..300 bpm (default 120) */
    "bpm": { type: "number", min: 20, max: 300, default: 120, unit: "bpm" }
    /** 1..12 (default 4) */
    "beats": { type: "number", min: 1, max: 12, default: 4, step: 1 }
    /** 200..4000 Hz (default 1000) */
    "freq": { type: "number", min: 200, max: 4000, default: 1000, unit: "Hz" }
    /** 200..6000 Hz (default 1500) */
    "accentFreq": { type: "number", min: 200, max: 6000, default: 1500, unit: "Hz" }
    /** 0..1 (default 0.7) */
    "amp": { type: "number", min: 0, max: 1, default: 0.7 }
  }
}
