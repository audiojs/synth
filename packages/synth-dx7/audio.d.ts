// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'dx7' */
export interface Dx7Options {
  /** 0..99 (default 99) */
  "op6Rate1"?: Auto
  /** 0..99 (default 99) */
  "op6Rate2"?: Auto
  /** 0..99 (default 99) */
  "op6Rate3"?: Auto
  /** 0..99 (default 99) */
  "op6Rate4"?: Auto
  /** 0..99 (default 99) */
  "op6Level1"?: Auto
  /** 0..99 (default 99) */
  "op6Level2"?: Auto
  /** 0..99 (default 99) */
  "op6Level3"?: Auto
  /** 0..99 (default 0) */
  "op6Level4"?: Auto
  /** 0..99 (default 39) */
  "op6BreakPoint"?: Auto
  /** 0..99 (default 0) */
  "op6LeftDepth"?: Auto
  /** 0..99 (default 0) */
  "op6RightDepth"?: Auto
  /** default "-lin" */
  "op6LeftCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** default "-lin" */
  "op6RightCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** 0..7 (default 0) */
  "op6RateScaling"?: Auto
  /** 0..3 (default 0) */
  "op6AmpModSens"?: Auto
  /** 0..7 (default 0) */
  "op6VelocitySens"?: Auto
  /** 0..99 (default 0) */
  "op6OutputLevel"?: Auto
  /** default "ratio" */
  "op6Mode"?: "ratio" | "fixed"
  /** 0..31 (default 1) */
  "op6Coarse"?: Auto
  /** 0..99 (default 0) */
  "op6Fine"?: Auto
  /** -7..7 (default 0) */
  "op6Detune"?: Auto
  /** 0..99 (default 99) */
  "op5Rate1"?: Auto
  /** 0..99 (default 99) */
  "op5Rate2"?: Auto
  /** 0..99 (default 99) */
  "op5Rate3"?: Auto
  /** 0..99 (default 99) */
  "op5Rate4"?: Auto
  /** 0..99 (default 99) */
  "op5Level1"?: Auto
  /** 0..99 (default 99) */
  "op5Level2"?: Auto
  /** 0..99 (default 99) */
  "op5Level3"?: Auto
  /** 0..99 (default 0) */
  "op5Level4"?: Auto
  /** 0..99 (default 39) */
  "op5BreakPoint"?: Auto
  /** 0..99 (default 0) */
  "op5LeftDepth"?: Auto
  /** 0..99 (default 0) */
  "op5RightDepth"?: Auto
  /** default "-lin" */
  "op5LeftCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** default "-lin" */
  "op5RightCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** 0..7 (default 0) */
  "op5RateScaling"?: Auto
  /** 0..3 (default 0) */
  "op5AmpModSens"?: Auto
  /** 0..7 (default 0) */
  "op5VelocitySens"?: Auto
  /** 0..99 (default 0) */
  "op5OutputLevel"?: Auto
  /** default "ratio" */
  "op5Mode"?: "ratio" | "fixed"
  /** 0..31 (default 1) */
  "op5Coarse"?: Auto
  /** 0..99 (default 0) */
  "op5Fine"?: Auto
  /** -7..7 (default 0) */
  "op5Detune"?: Auto
  /** 0..99 (default 99) */
  "op4Rate1"?: Auto
  /** 0..99 (default 99) */
  "op4Rate2"?: Auto
  /** 0..99 (default 99) */
  "op4Rate3"?: Auto
  /** 0..99 (default 99) */
  "op4Rate4"?: Auto
  /** 0..99 (default 99) */
  "op4Level1"?: Auto
  /** 0..99 (default 99) */
  "op4Level2"?: Auto
  /** 0..99 (default 99) */
  "op4Level3"?: Auto
  /** 0..99 (default 0) */
  "op4Level4"?: Auto
  /** 0..99 (default 39) */
  "op4BreakPoint"?: Auto
  /** 0..99 (default 0) */
  "op4LeftDepth"?: Auto
  /** 0..99 (default 0) */
  "op4RightDepth"?: Auto
  /** default "-lin" */
  "op4LeftCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** default "-lin" */
  "op4RightCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** 0..7 (default 0) */
  "op4RateScaling"?: Auto
  /** 0..3 (default 0) */
  "op4AmpModSens"?: Auto
  /** 0..7 (default 0) */
  "op4VelocitySens"?: Auto
  /** 0..99 (default 0) */
  "op4OutputLevel"?: Auto
  /** default "ratio" */
  "op4Mode"?: "ratio" | "fixed"
  /** 0..31 (default 1) */
  "op4Coarse"?: Auto
  /** 0..99 (default 0) */
  "op4Fine"?: Auto
  /** -7..7 (default 0) */
  "op4Detune"?: Auto
  /** 0..99 (default 99) */
  "op3Rate1"?: Auto
  /** 0..99 (default 99) */
  "op3Rate2"?: Auto
  /** 0..99 (default 99) */
  "op3Rate3"?: Auto
  /** 0..99 (default 99) */
  "op3Rate4"?: Auto
  /** 0..99 (default 99) */
  "op3Level1"?: Auto
  /** 0..99 (default 99) */
  "op3Level2"?: Auto
  /** 0..99 (default 99) */
  "op3Level3"?: Auto
  /** 0..99 (default 0) */
  "op3Level4"?: Auto
  /** 0..99 (default 39) */
  "op3BreakPoint"?: Auto
  /** 0..99 (default 0) */
  "op3LeftDepth"?: Auto
  /** 0..99 (default 0) */
  "op3RightDepth"?: Auto
  /** default "-lin" */
  "op3LeftCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** default "-lin" */
  "op3RightCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** 0..7 (default 0) */
  "op3RateScaling"?: Auto
  /** 0..3 (default 0) */
  "op3AmpModSens"?: Auto
  /** 0..7 (default 0) */
  "op3VelocitySens"?: Auto
  /** 0..99 (default 0) */
  "op3OutputLevel"?: Auto
  /** default "ratio" */
  "op3Mode"?: "ratio" | "fixed"
  /** 0..31 (default 1) */
  "op3Coarse"?: Auto
  /** 0..99 (default 0) */
  "op3Fine"?: Auto
  /** -7..7 (default 0) */
  "op3Detune"?: Auto
  /** 0..99 (default 99) */
  "op2Rate1"?: Auto
  /** 0..99 (default 99) */
  "op2Rate2"?: Auto
  /** 0..99 (default 99) */
  "op2Rate3"?: Auto
  /** 0..99 (default 99) */
  "op2Rate4"?: Auto
  /** 0..99 (default 99) */
  "op2Level1"?: Auto
  /** 0..99 (default 99) */
  "op2Level2"?: Auto
  /** 0..99 (default 99) */
  "op2Level3"?: Auto
  /** 0..99 (default 0) */
  "op2Level4"?: Auto
  /** 0..99 (default 39) */
  "op2BreakPoint"?: Auto
  /** 0..99 (default 0) */
  "op2LeftDepth"?: Auto
  /** 0..99 (default 0) */
  "op2RightDepth"?: Auto
  /** default "-lin" */
  "op2LeftCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** default "-lin" */
  "op2RightCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** 0..7 (default 0) */
  "op2RateScaling"?: Auto
  /** 0..3 (default 0) */
  "op2AmpModSens"?: Auto
  /** 0..7 (default 0) */
  "op2VelocitySens"?: Auto
  /** 0..99 (default 0) */
  "op2OutputLevel"?: Auto
  /** default "ratio" */
  "op2Mode"?: "ratio" | "fixed"
  /** 0..31 (default 1) */
  "op2Coarse"?: Auto
  /** 0..99 (default 0) */
  "op2Fine"?: Auto
  /** -7..7 (default 0) */
  "op2Detune"?: Auto
  /** 0..99 (default 99) */
  "op1Rate1"?: Auto
  /** 0..99 (default 99) */
  "op1Rate2"?: Auto
  /** 0..99 (default 99) */
  "op1Rate3"?: Auto
  /** 0..99 (default 99) */
  "op1Rate4"?: Auto
  /** 0..99 (default 99) */
  "op1Level1"?: Auto
  /** 0..99 (default 99) */
  "op1Level2"?: Auto
  /** 0..99 (default 99) */
  "op1Level3"?: Auto
  /** 0..99 (default 0) */
  "op1Level4"?: Auto
  /** 0..99 (default 39) */
  "op1BreakPoint"?: Auto
  /** 0..99 (default 0) */
  "op1LeftDepth"?: Auto
  /** 0..99 (default 0) */
  "op1RightDepth"?: Auto
  /** default "-lin" */
  "op1LeftCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** default "-lin" */
  "op1RightCurve"?: "-lin" | "-exp" | "+exp" | "+lin"
  /** 0..7 (default 0) */
  "op1RateScaling"?: Auto
  /** 0..3 (default 0) */
  "op1AmpModSens"?: Auto
  /** 0..7 (default 0) */
  "op1VelocitySens"?: Auto
  /** 0..99 (default 99) */
  "op1OutputLevel"?: Auto
  /** default "ratio" */
  "op1Mode"?: "ratio" | "fixed"
  /** 0..31 (default 1) */
  "op1Coarse"?: Auto
  /** 0..99 (default 0) */
  "op1Fine"?: Auto
  /** -7..7 (default 0) */
  "op1Detune"?: Auto
  /** 0..99 (default 99) */
  "pitchRate1"?: Auto
  /** 0..99 (default 99) */
  "pitchRate2"?: Auto
  /** 0..99 (default 99) */
  "pitchRate3"?: Auto
  /** 0..99 (default 99) */
  "pitchRate4"?: Auto
  /** 0..99 (default 50) */
  "pitchLevel1"?: Auto
  /** 0..99 (default 50) */
  "pitchLevel2"?: Auto
  /** 0..99 (default 50) */
  "pitchLevel3"?: Auto
  /** 0..99 (default 50) */
  "pitchLevel4"?: Auto
  /** 1..32 (default 1) */
  "algorithm"?: Auto
  /** 0..7 (default 0) */
  "feedback"?: Auto
  /** default true */
  "oscKeySync"?: boolean
  /** 0..99 (default 35) */
  "lfoSpeed"?: Auto
  /** 0..99 (default 0) */
  "lfoDelay"?: Auto
  /** 0..99 (default 0) */
  "lfoPitchDepth"?: Auto
  /** 0..99 (default 0) */
  "lfoAmpDepth"?: Auto
  /** default true */
  "lfoKeySync"?: boolean
  /** default "triangle" */
  "lfoWave"?: "triangle" | "saw-down" | "saw-up" | "square" | "sine" | "sample-hold"
  /** 0..7 (default 3) */
  "pitchModSens"?: Auto
  /** -24..24 st (default 0) */
  "transpose"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const dx7: {
  (ctx: Ctx): Process
  channels: {"inputs":[],"outputs":"any"}
  tail: (at: { sampleRate: number, params: Live, buffers: {} }) => number
  params: {
    /** 0..99 (default 99) */
    "op6Rate1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op6Rate2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op6Rate3": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op6Rate4": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op6Level1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op6Level2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op6Level3": { type: "number", default: 99 }
    /** 0..99 (default 0) */
    "op6Level4": { type: "number", default: 0 }
    /** 0..99 (default 39) */
    "op6BreakPoint": { type: "number", default: 39 }
    /** 0..99 (default 0) */
    "op6LeftDepth": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op6RightDepth": { type: "number", default: 0 }
    /** default "-lin" */
    "op6LeftCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** default "-lin" */
    "op6RightCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** 0..7 (default 0) */
    "op6RateScaling": { type: "number", default: 0 }
    /** 0..3 (default 0) */
    "op6AmpModSens": { type: "number", default: 0 }
    /** 0..7 (default 0) */
    "op6VelocitySens": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op6OutputLevel": { type: "number", default: 0 }
    /** default "ratio" */
    "op6Mode": { type: "enum", values: ["ratio","fixed"], default: "ratio" }
    /** 0..31 (default 1) */
    "op6Coarse": { type: "number", default: 1 }
    /** 0..99 (default 0) */
    "op6Fine": { type: "number", default: 0 }
    /** -7..7 (default 0) */
    "op6Detune": { type: "number", default: 0 }
    /** 0..99 (default 99) */
    "op5Rate1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op5Rate2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op5Rate3": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op5Rate4": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op5Level1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op5Level2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op5Level3": { type: "number", default: 99 }
    /** 0..99 (default 0) */
    "op5Level4": { type: "number", default: 0 }
    /** 0..99 (default 39) */
    "op5BreakPoint": { type: "number", default: 39 }
    /** 0..99 (default 0) */
    "op5LeftDepth": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op5RightDepth": { type: "number", default: 0 }
    /** default "-lin" */
    "op5LeftCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** default "-lin" */
    "op5RightCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** 0..7 (default 0) */
    "op5RateScaling": { type: "number", default: 0 }
    /** 0..3 (default 0) */
    "op5AmpModSens": { type: "number", default: 0 }
    /** 0..7 (default 0) */
    "op5VelocitySens": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op5OutputLevel": { type: "number", default: 0 }
    /** default "ratio" */
    "op5Mode": { type: "enum", values: ["ratio","fixed"], default: "ratio" }
    /** 0..31 (default 1) */
    "op5Coarse": { type: "number", default: 1 }
    /** 0..99 (default 0) */
    "op5Fine": { type: "number", default: 0 }
    /** -7..7 (default 0) */
    "op5Detune": { type: "number", default: 0 }
    /** 0..99 (default 99) */
    "op4Rate1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op4Rate2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op4Rate3": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op4Rate4": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op4Level1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op4Level2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op4Level3": { type: "number", default: 99 }
    /** 0..99 (default 0) */
    "op4Level4": { type: "number", default: 0 }
    /** 0..99 (default 39) */
    "op4BreakPoint": { type: "number", default: 39 }
    /** 0..99 (default 0) */
    "op4LeftDepth": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op4RightDepth": { type: "number", default: 0 }
    /** default "-lin" */
    "op4LeftCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** default "-lin" */
    "op4RightCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** 0..7 (default 0) */
    "op4RateScaling": { type: "number", default: 0 }
    /** 0..3 (default 0) */
    "op4AmpModSens": { type: "number", default: 0 }
    /** 0..7 (default 0) */
    "op4VelocitySens": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op4OutputLevel": { type: "number", default: 0 }
    /** default "ratio" */
    "op4Mode": { type: "enum", values: ["ratio","fixed"], default: "ratio" }
    /** 0..31 (default 1) */
    "op4Coarse": { type: "number", default: 1 }
    /** 0..99 (default 0) */
    "op4Fine": { type: "number", default: 0 }
    /** -7..7 (default 0) */
    "op4Detune": { type: "number", default: 0 }
    /** 0..99 (default 99) */
    "op3Rate1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op3Rate2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op3Rate3": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op3Rate4": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op3Level1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op3Level2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op3Level3": { type: "number", default: 99 }
    /** 0..99 (default 0) */
    "op3Level4": { type: "number", default: 0 }
    /** 0..99 (default 39) */
    "op3BreakPoint": { type: "number", default: 39 }
    /** 0..99 (default 0) */
    "op3LeftDepth": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op3RightDepth": { type: "number", default: 0 }
    /** default "-lin" */
    "op3LeftCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** default "-lin" */
    "op3RightCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** 0..7 (default 0) */
    "op3RateScaling": { type: "number", default: 0 }
    /** 0..3 (default 0) */
    "op3AmpModSens": { type: "number", default: 0 }
    /** 0..7 (default 0) */
    "op3VelocitySens": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op3OutputLevel": { type: "number", default: 0 }
    /** default "ratio" */
    "op3Mode": { type: "enum", values: ["ratio","fixed"], default: "ratio" }
    /** 0..31 (default 1) */
    "op3Coarse": { type: "number", default: 1 }
    /** 0..99 (default 0) */
    "op3Fine": { type: "number", default: 0 }
    /** -7..7 (default 0) */
    "op3Detune": { type: "number", default: 0 }
    /** 0..99 (default 99) */
    "op2Rate1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op2Rate2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op2Rate3": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op2Rate4": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op2Level1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op2Level2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op2Level3": { type: "number", default: 99 }
    /** 0..99 (default 0) */
    "op2Level4": { type: "number", default: 0 }
    /** 0..99 (default 39) */
    "op2BreakPoint": { type: "number", default: 39 }
    /** 0..99 (default 0) */
    "op2LeftDepth": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op2RightDepth": { type: "number", default: 0 }
    /** default "-lin" */
    "op2LeftCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** default "-lin" */
    "op2RightCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** 0..7 (default 0) */
    "op2RateScaling": { type: "number", default: 0 }
    /** 0..3 (default 0) */
    "op2AmpModSens": { type: "number", default: 0 }
    /** 0..7 (default 0) */
    "op2VelocitySens": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op2OutputLevel": { type: "number", default: 0 }
    /** default "ratio" */
    "op2Mode": { type: "enum", values: ["ratio","fixed"], default: "ratio" }
    /** 0..31 (default 1) */
    "op2Coarse": { type: "number", default: 1 }
    /** 0..99 (default 0) */
    "op2Fine": { type: "number", default: 0 }
    /** -7..7 (default 0) */
    "op2Detune": { type: "number", default: 0 }
    /** 0..99 (default 99) */
    "op1Rate1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op1Rate2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op1Rate3": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op1Rate4": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op1Level1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op1Level2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "op1Level3": { type: "number", default: 99 }
    /** 0..99 (default 0) */
    "op1Level4": { type: "number", default: 0 }
    /** 0..99 (default 39) */
    "op1BreakPoint": { type: "number", default: 39 }
    /** 0..99 (default 0) */
    "op1LeftDepth": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "op1RightDepth": { type: "number", default: 0 }
    /** default "-lin" */
    "op1LeftCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** default "-lin" */
    "op1RightCurve": { type: "enum", values: ["-lin","-exp","+exp","+lin"], default: "-lin" }
    /** 0..7 (default 0) */
    "op1RateScaling": { type: "number", default: 0 }
    /** 0..3 (default 0) */
    "op1AmpModSens": { type: "number", default: 0 }
    /** 0..7 (default 0) */
    "op1VelocitySens": { type: "number", default: 0 }
    /** 0..99 (default 99) */
    "op1OutputLevel": { type: "number", default: 99 }
    /** default "ratio" */
    "op1Mode": { type: "enum", values: ["ratio","fixed"], default: "ratio" }
    /** 0..31 (default 1) */
    "op1Coarse": { type: "number", default: 1 }
    /** 0..99 (default 0) */
    "op1Fine": { type: "number", default: 0 }
    /** -7..7 (default 0) */
    "op1Detune": { type: "number", default: 0 }
    /** 0..99 (default 99) */
    "pitchRate1": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "pitchRate2": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "pitchRate3": { type: "number", default: 99 }
    /** 0..99 (default 99) */
    "pitchRate4": { type: "number", default: 99 }
    /** 0..99 (default 50) */
    "pitchLevel1": { type: "number", default: 50 }
    /** 0..99 (default 50) */
    "pitchLevel2": { type: "number", default: 50 }
    /** 0..99 (default 50) */
    "pitchLevel3": { type: "number", default: 50 }
    /** 0..99 (default 50) */
    "pitchLevel4": { type: "number", default: 50 }
    /** 1..32 (default 1) */
    "algorithm": { type: "number", default: 1 }
    /** 0..7 (default 0) */
    "feedback": { type: "number", default: 0 }
    /** default true */
    "oscKeySync": { type: "bool", default: true }
    /** 0..99 (default 35) */
    "lfoSpeed": { type: "number", default: 35 }
    /** 0..99 (default 0) */
    "lfoDelay": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "lfoPitchDepth": { type: "number", default: 0 }
    /** 0..99 (default 0) */
    "lfoAmpDepth": { type: "number", default: 0 }
    /** default true */
    "lfoKeySync": { type: "bool", default: true }
    /** default "triangle" */
    "lfoWave": { type: "enum", values: ["triangle","saw-down","saw-up","square","sine","sample-hold"], default: "triangle" }
    /** 0..7 (default 3) */
    "pitchModSens": { type: "number", default: 3 }
    /** -24..24 st (default 0) */
    "transpose": { type: "number", default: 0 }
  }
}
