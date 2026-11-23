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
    "freq": { type: "number", min: 20, max: 5000, default: 440, unit: "Hz", curve: "log" }
    /** default "bar" */
    "model": { type: "enum", values: ["string","bar","membrane","plate","tube-open","tube-closed"], default: "bar" }
    /** 1..16 (default 8) */
    "nmodes": { type: "number", min: 1, max: 16, default: 8, step: 1 }
    /** 0.05..20 s (default 2) */
    "t60": { type: "number", min: 0.05, max: 20, default: 2, unit: "s", curve: "log" }
    /** 0..2 (default 0.7) */
    "damping": { type: "number", min: 0, max: 2, default: 0.7 }
    /** 0..0.01 (default 0) */
    "inharmonicity": { type: "number", min: 0, max: 0.01, default: 0 }
    /** 0..1 (default 0.5) */
    "strike": { type: "number", min: 0, max: 1, default: 0.5 }
    /** default "impulse" */
    "exciter": { type: "enum", values: ["impulse","noise"], default: "impulse" }
    /** 0..1 (default 0.8) */
    "amp": { type: "number", min: 0, max: 1, default: 0.8 }
    /** 1..65536 (default 9) */
    "seed": { type: "number", min: 1, max: 65536, default: 9, step: 1 }
  }
}
