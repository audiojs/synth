// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'poly' */
export interface PolyOptions {
  /** 1..32 (default 16) */
  "voices"?: Auto
  /** default "sawtooth" */
  "type"?: "sine" | "square" | "sawtooth" | "triangle"
  /** 0..1 (default 0.7) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const poly: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 1..32 (default 16) */
    "voices": { type: "number", default: 16 }
    /** default "sawtooth" */
    "type": { type: "enum", values: ["sine","square","sawtooth","triangle"], default: "sawtooth" }
    /** 0..1 (default 0.7) */
    "amp": { type: "number", default: 0.7 }
  }
}
