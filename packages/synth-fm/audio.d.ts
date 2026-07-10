// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
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
    "freq": { type: "number", default: 440 }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", default: 0.8 }
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
    "freq": { type: "number", default: 440 }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", default: 0.8 }
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
    "freq": { type: "number", default: 440 }
    /** 0.01..20 (default 2) */
    "ratio": { type: "number", default: 2 }
    /** 0..20 rad (default 5) */
    "index": { type: "number", default: 5 }
    /** 0..10 s (default 0) */
    "indexDecay": { type: "number", default: 0 }
    /** 0..20 rad (default 0) */
    "indexFloor": { type: "number", default: 0 }
    /** 0..6.2832 rad (default 0) */
    "feedback": { type: "number", default: 0 }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", default: 0.8 }
    /** 0..2 s (default 0.005) */
    "attack": { type: "number", default: 0.005 }
    /** 0..4 s (default 0.1) */
    "release": { type: "number", default: 0.1 }
  }
}
