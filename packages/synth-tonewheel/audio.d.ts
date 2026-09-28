// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'tonewheel' */
export interface TonewheelOptions {
  /** 0..8 (default 8) */
  "drawbar1"?: Auto
  /** 0..8 (default 8) */
  "drawbar2"?: Auto
  /** 0..8 (default 8) */
  "drawbar3"?: Auto
  /** 0..8 (default 0) */
  "drawbar4"?: Auto
  /** 0..8 (default 0) */
  "drawbar5"?: Auto
  /** 0..8 (default 0) */
  "drawbar6"?: Auto
  /** 0..8 (default 0) */
  "drawbar7"?: Auto
  /** 0..8 (default 0) */
  "drawbar8"?: Auto
  /** 0..8 (default 0) */
  "drawbar9"?: Auto
  /** default "off" */
  "percussion"?: "off" | "second" | "third"
  /** default "fast" */
  "percussionDecay"?: "fast" | "slow"
  /** default "normal" */
  "percussionVolume"?: "normal" | "soft"
  /** default "off" */
  "vibrato"?: "off" | "v1" | "v2" | "v3" | "c1" | "c2" | "c3"
  /** 0..1 (default 1) */
  "click"?: Auto
  /** 0..1 (default 0.8) */
  "amp"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const tonewheel: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  streaming: false
  params: {
    /** 0..8 (default 8) */
    "drawbar1": { type: "number", default: 8 }
    /** 0..8 (default 8) */
    "drawbar2": { type: "number", default: 8 }
    /** 0..8 (default 8) */
    "drawbar3": { type: "number", default: 8 }
    /** 0..8 (default 0) */
    "drawbar4": { type: "number", default: 0 }
    /** 0..8 (default 0) */
    "drawbar5": { type: "number", default: 0 }
    /** 0..8 (default 0) */
    "drawbar6": { type: "number", default: 0 }
    /** 0..8 (default 0) */
    "drawbar7": { type: "number", default: 0 }
    /** 0..8 (default 0) */
    "drawbar8": { type: "number", default: 0 }
    /** 0..8 (default 0) */
    "drawbar9": { type: "number", default: 0 }
    /** default "off" */
    "percussion": { type: "enum", values: ["off","second","third"], default: "off" }
    /** default "fast" */
    "percussionDecay": { type: "enum", values: ["fast","slow"], default: "fast" }
    /** default "normal" */
    "percussionVolume": { type: "enum", values: ["normal","soft"], default: "normal" }
    /** default "off" */
    "vibrato": { type: "enum", values: ["off","v1","v2","v3","c1","c2","c3"], default: "off" }
    /** 0..1 (default 1) */
    "click": { type: "number", default: 1 }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", default: 0.8 }
  }
}

