// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'chirp' */
export interface ChirpOptions {
  /** 1..20000 Hz (default 20) */
  "f0"?: Auto
  /** 1..22050 Hz (default 20000) */
  "f1"?: Auto
  /** default "exp" */
  "method"?: "exp" | "linear"
  /** 0..1 (default 0.9) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const chirp: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 1..20000 Hz (default 20) */
    "f0": { type: "number", default: 20 }
    /** 1..22050 Hz (default 20000) */
    "f1": { type: "number", default: 20000 }
    /** default "exp" */
    "method": { type: "enum", values: ["exp","linear"], default: "exp" }
    /** 0..1 (default 0.9) */
    "amp": { type: "number", default: 0.9 }
  }
}
