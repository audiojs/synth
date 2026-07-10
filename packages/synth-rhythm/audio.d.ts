// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'rhythm' */
export interface RhythmOptions {
  /** 20..300 (default 120) */
  "bpm"?: Auto
  /** 1..12 (default 4) */
  "beats"?: Auto
  /** 200..4000 Hz (default 1000) */
  "freq"?: Auto
  /** 200..6000 Hz (default 1500) */
  "accentFreq"?: Auto
  /** 0..1 (default 0.7) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const rhythm: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 20..300 (default 120) */
    "bpm": { type: "number", default: 120 }
    /** 1..12 (default 4) */
    "beats": { type: "number", default: 4 }
    /** 200..4000 Hz (default 1000) */
    "freq": { type: "number", default: 1000 }
    /** 200..6000 Hz (default 1500) */
    "accentFreq": { type: "number", default: 1500 }
    /** 0..1 (default 0.7) */
    "amp": { type: "number", default: 0.7 }
  }
}
