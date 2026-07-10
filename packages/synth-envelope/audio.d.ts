// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'adsr' */
export interface AdsrOptions {
  /** 0.001..2 s (default 0.01) */
  "attack"?: Auto
  /** 0.001..2 s (default 0.1) */
  "decay"?: Auto
  /** 0..1 (default 0.7) */
  "sustain"?: Auto
  /** 0.001..4 s (default 0.3) */
  "release"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const adsr: {
  (ctx: Ctx): Process
  channels: "any"
  streaming: false
  params: {
    /** 0.001..2 s (default 0.01) */
    "attack": { type: "number", default: 0.01 }
    /** 0.001..2 s (default 0.1) */
    "decay": { type: "number", default: 0.1 }
    /** 0..1 (default 0.7) */
    "sustain": { type: "number", default: 0.7 }
    /** 0.001..4 s (default 0.3) */
    "release": { type: "number", default: 0.3 }
  }
}
