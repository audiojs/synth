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

/** Chainable-host options for 'pluck' */
export interface PluckOptions {
  /** 20..4000 Hz (default 220) */
  "freq"?: Auto
  /** 0.9..0.9999 (default 0.996) */
  "damp"?: Auto
  /** 0..1 (default 0.7) */
  "amp"?: Auto
  /** 1..65536 (default 1) */
  "seed"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const pluck: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 20..4000 Hz (default 220) */
    "freq": { type: "number", min: 20, max: 4000, default: 220, unit: "Hz", curve: "log" }
    /** 0.9..0.9999 (default 0.996) */
    "damp": { type: "number", min: 0.9, max: 0.9999, default: 0.996 }
    /** 0..1 (default 0.7) */
    "amp": { type: "number", min: 0, max: 1, default: 0.7 }
    /** 1..65536 (default 1) */
    "seed": { type: "number", min: 1, max: 65536, default: 1, step: 1 }
  }
}
