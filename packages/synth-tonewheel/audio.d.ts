// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/plugin. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Transport = Readonly<{ playing: boolean, bpm: number, beat: number, barStart: number, timeSig: [number, number] }>
/** What a host hands a processor it builds: the contract's Context (CONTRACT.d.ts, 1.0) */
type Ctx = { readonly sampleRate: number, readonly maxBlockSize: number, readonly maxChannels: number, readonly layouts?: { readonly inputs: readonly (string | undefined)[], readonly outputs: readonly (string | undefined)[] }, readonly params: Live, readonly buffers: Readonly<Record<string, Float32Array[] | undefined>>, readonly events?: readonly { time: number, kind: 'on' | 'off', midi: number, velocity: number, id: number }[], emit(name: string, value: number): void, readonly transport: Transport }
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
    "drawbar1": { type: "number", min: 0, max: 8, default: 8, step: 1 }
    /** 0..8 (default 8) */
    "drawbar2": { type: "number", min: 0, max: 8, default: 8, step: 1 }
    /** 0..8 (default 8) */
    "drawbar3": { type: "number", min: 0, max: 8, default: 8, step: 1 }
    /** 0..8 (default 0) */
    "drawbar4": { type: "number", min: 0, max: 8, default: 0, step: 1 }
    /** 0..8 (default 0) */
    "drawbar5": { type: "number", min: 0, max: 8, default: 0, step: 1 }
    /** 0..8 (default 0) */
    "drawbar6": { type: "number", min: 0, max: 8, default: 0, step: 1 }
    /** 0..8 (default 0) */
    "drawbar7": { type: "number", min: 0, max: 8, default: 0, step: 1 }
    /** 0..8 (default 0) */
    "drawbar8": { type: "number", min: 0, max: 8, default: 0, step: 1 }
    /** 0..8 (default 0) */
    "drawbar9": { type: "number", min: 0, max: 8, default: 0, step: 1 }
    /** default "off" */
    "percussion": { type: "enum", values: ["off","second","third"], default: "off" }
    /** default "fast" */
    "percussionDecay": { type: "enum", values: ["fast","slow"], default: "fast" }
    /** default "normal" */
    "percussionVolume": { type: "enum", values: ["normal","soft"], default: "normal" }
    /** default "off" */
    "vibrato": { type: "enum", values: ["off","v1","v2","v3","c1","c2","c3"], default: "off" }
    /** 0..1 (default 1) */
    "click": { type: "number", min: 0, max: 1, default: 1 }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", min: 0, max: 1, default: 0.8 }
  }
}
