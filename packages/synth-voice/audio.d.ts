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
  "fc"?: Auto
  /** @deprecated former name of "fc" */
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
    "attack": { type: "number", min: 0.001, max: 2, default: 0.01, unit: "s", curve: "log" }
    /** 0.001..2 s (default 0.15) */
    "decay": { type: "number", min: 0.001, max: 2, default: 0.15, unit: "s", curve: "log" }
    /** 0..1 (default 0.6) */
    "sustain": { type: "number", min: 0, max: 1, default: 0.6 }
    /** 0.001..4 s (default 0.25) */
    "release": { type: "number", min: 0.001, max: 4, default: 0.25, unit: "s", curve: "log" }
    /** 100..16000 Hz (default 3000) */
    "fc": { type: "number", min: 100, max: 16000, default: 3000, unit: "Hz", curve: "log", alias: "cutoff" }
    /** 0..1 (default 0.6) */
    "envAmount": { type: "number", min: 0, max: 1, default: 0.6 }
    /** 0..1 (default 0.7) */
    "amp": { type: "number", min: 0, max: 1, default: 0.7 }
  }
}
