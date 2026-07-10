// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'modal' */
export interface ModalOptions {
  /** 20..5000 Hz (default 440) */
  "freq"?: Auto
  /** default "bar" */
  "model"?: "string" | "bar" | "membrane" | "plate" | "tube-open" | "tube-closed"
  /** 1..16 (default 8) */
  "nmodes"?: Auto
  /** 0.05..20 s (default 2) */
  "t60"?: Auto
  /** 0..2 (default 0.7) */
  "damping"?: Auto
  /** 0..0.01 (default 0) */
  "inharmonicity"?: Auto
  /** 0..1 (default 0.5) */
  "strike"?: Auto
  /** default "impulse" */
  "exciter"?: "impulse" | "noise"
  /** 0..1 (default 0.8) */
  "amp"?: Auto
  /** 1..65536 (default 9) */
  "seed"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const modal: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 20..5000 Hz (default 440) */
    "freq": { type: "number", default: 440 }
    /** default "bar" */
    "model": { type: "enum", values: ["string","bar","membrane","plate","tube-open","tube-closed"], default: "bar" }
    /** 1..16 (default 8) */
    "nmodes": { type: "number", default: 8 }
    /** 0.05..20 s (default 2) */
    "t60": { type: "number", default: 2 }
    /** 0..2 (default 0.7) */
    "damping": { type: "number", default: 0.7 }
    /** 0..0.01 (default 0) */
    "inharmonicity": { type: "number", default: 0 }
    /** 0..1 (default 0.5) */
    "strike": { type: "number", default: 0.5 }
    /** default "impulse" */
    "exciter": { type: "enum", values: ["impulse","noise"], default: "impulse" }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", default: 0.8 }
    /** 1..65536 (default 9) */
    "seed": { type: "number", default: 9 }
  }
}
