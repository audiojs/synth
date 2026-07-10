// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'voice' */
export interface VoiceOptions {
  /** default "sawtooth" */
  "type"?: "sine" | "square" | "sawtooth" | "triangle"
  /** 0.001..2 s (default 0.01) */
  "attack"?: Auto
  /** 0.001..2 s (default 0.15) */
  "decay"?: Auto
  /** 0..1 (default 0.6) */
  "sustain"?: Auto
  /** 0.001..4 s (default 0.25) */
  "release"?: Auto
  /** 100..16000 Hz (default 3000) */
  "cutoff"?: Auto
  /** 0..1 (default 0.6) */
  "envAmount"?: Auto
  /** 0..1 (default 0.7) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const voice: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** default "sawtooth" */
    "type": { type: "enum", values: ["sine","square","sawtooth","triangle"], default: "sawtooth" }
    /** 0.001..2 s (default 0.01) */
    "attack": { type: "number", default: 0.01 }
    /** 0.001..2 s (default 0.15) */
    "decay": { type: "number", default: 0.15 }
    /** 0..1 (default 0.6) */
    "sustain": { type: "number", default: 0.6 }
    /** 0.001..4 s (default 0.25) */
    "release": { type: "number", default: 0.25 }
    /** 100..16000 Hz (default 3000) */
    "cutoff": { type: "number", default: 3000 }
    /** 0..1 (default 0.6) */
    "envAmount": { type: "number", default: 0.6 }
    /** 0..1 (default 0.7) */
    "amp": { type: "number", default: 0.7 }
  }
}
