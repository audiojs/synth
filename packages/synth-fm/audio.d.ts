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

/** Chainable-host options for 'bell' */
export interface BellOptions {
  /** 20..20000 Hz (default 440) */
  "freq"?: Auto
  /** 0..1 (default 0.8) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const bell: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 20..20000 Hz (default 440) */
    "freq": { type: "number", min: 20, max: 20000, default: 440, unit: "Hz", curve: "log" }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", min: 0, max: 1, default: 0.8 }
  }
}

/** Chainable-host options for 'epiano' */
export interface EpianoOptions {
  /** 20..20000 Hz (default 440) */
  "freq"?: Auto
  /** 0..1 (default 0.8) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const epiano: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 20..20000 Hz (default 440) */
    "freq": { type: "number", min: 20, max: 20000, default: 440, unit: "Hz", curve: "log" }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", min: 0, max: 1, default: 0.8 }
  }
}

/** Chainable-host options for 'fm' */
export interface FmOptions {
  /** 20..20000 Hz (default 440) */
  "freq"?: Auto
  /** 0.01..20 (default 2) */
  "ratio"?: Auto
  /** 0..20 rad (default 5) */
  "index"?: Auto
  /** 0..10 s (default 0) */
  "indexDecay"?: Auto
  /** 0..20 rad (default 0) */
  "indexFloor"?: Auto
  /** 0..6.2832 rad (default 0) */
  "feedback"?: Auto
  /** 0..1 (default 0.8) */
  "amp"?: Auto
  /** 0..2 s (default 0.005) */
  "attack"?: Auto
  /** 0..4 s (default 0.1) */
  "release"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const fm: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 20..20000 Hz (default 440) */
    "freq": { type: "number", min: 20, max: 20000, default: 440, unit: "Hz", curve: "log" }
    /** 0.01..20 (default 2) */
    "ratio": { type: "number", min: 0.01, max: 20, default: 2, curve: "log" }
    /** 0..20 rad (default 5) */
    "index": { type: "number", min: 0, max: 20, default: 5, unit: "rad" }
    /** 0..10 s (default 0) */
    "indexDecay": { type: "number", min: 0, max: 10, default: 0, unit: "s" }
    /** 0..20 rad (default 0) */
    "indexFloor": { type: "number", min: 0, max: 20, default: 0, unit: "rad" }
    /** 0..6.2832 rad (default 0) */
    "feedback": { type: "number", min: 0, max: 6.2832, default: 0, unit: "rad" }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", min: 0, max: 1, default: 0.8 }
    /** 0..2 s (default 0.005) */
    "attack": { type: "number", min: 0, max: 2, default: 0.005, unit: "s" }
    /** 0..4 s (default 0.1) */
    "release": { type: "number", min: 0, max: 4, default: 0.1, unit: "s" }
  }
}
