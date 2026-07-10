// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'noise' */
export interface NoiseOptions {
  /** default "white" */
  "color"?: "white" | "pink" | "brown" | "blue" | "violet"
  /** 1..65536 (default 1) */
  "seed"?: Auto
  /** 0..1 (default 0.8) */
  "gain"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const noise: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** default "white" */
    "color": { type: "enum", values: ["white","pink","brown","blue","violet"], default: "white" }
    /** 1..65536 (default 1) */
    "seed": { type: "number", default: 1 }
    /** 0..1 (default 0.8) */
    "gain": { type: "number", default: 0.8 }
  }
}
