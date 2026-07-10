// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
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
    "freq": { type: "number", default: 220 }
    /** 0.9..0.9999 (default 0.996) */
    "damp": { type: "number", default: 0.996 }
    /** 0..1 (default 0.7) */
    "amp": { type: "number", default: 0.7 }
    /** 1..65536 (default 1) */
    "seed": { type: "number", default: 1 }
  }
}
