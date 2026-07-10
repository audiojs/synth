// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'osc' */
export interface OscOptions {
  /** 20..20000 Hz (default 440) */
  "freq"?: Auto
  /** -1200..1200 cents (default 0) */
  "detune"?: Auto
  /** 0..1 (default 0.8) */
  "gain"?: Auto
  /** default "sine" */
  "type"?: "sine" | "square" | "sawtooth" | "triangle"
  at?: number | string
  duration?: number | string
}

export declare const osc: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":1}
  params: {
    /** 20..20000 Hz (default 440) */
    "freq": { type: "number", default: 440 }
    /** -1200..1200 cents (default 0) */
    "detune": { type: "number", default: 0 }
    /** 0..1 (default 0.8) */
    "gain": { type: "number", default: 0.8 }
    /** default "sine" */
    "type": { type: "enum", values: ["sine","square","sawtooth","triangle"], default: "sine" }
  }
}
