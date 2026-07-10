// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'cymbal' */
export interface CymbalOptions {
  /** 100..800 Hz (default 200) */
  "freq"?: Auto
  /** 0..1 (default 0.5) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const cymbal: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 100..800 Hz (default 200) */
    "freq": { type: "number", default: 200 }
    /** 0..1 (default 0.5) */
    "amp": { type: "number", default: 0.5 }
  }
}

/** Chainable-host options for 'kick' */
export interface KickOptions {
  /** 30..120 Hz (default 55) */
  "freq"?: Auto
  /** 1..8 (default 3) */
  "drop"?: Auto
  /** 0..1 (default 0.9) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const kick: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 30..120 Hz (default 55) */
    "freq": { type: "number", default: 55 }
    /** 1..8 (default 3) */
    "drop": { type: "number", default: 3 }
    /** 0..1 (default 0.9) */
    "amp": { type: "number", default: 0.9 }
  }
}

/** Chainable-host options for 'snare' */
export interface SnareOptions {
  /** 0..1 (default 0.7) */
  "amp"?: Auto
  /** 1..65536 (default 9) */
  "seed"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const snare: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 0..1 (default 0.7) */
    "amp": { type: "number", default: 0.7 }
    /** 1..65536 (default 9) */
    "seed": { type: "number", default: 9 }
  }
}
