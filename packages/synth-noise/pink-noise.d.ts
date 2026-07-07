type Buf = Float32Array | Float64Array | number[]
interface BiquadCoef { b0: number; b1: number; b2: number; a1: number; a2: number }
type SOS = BiquadCoef[]

/** Paul Kellet pink-noise filter (IIR approximation, -3dB/oct) applied to white noise input */
declare function pinkNoise(data: Buf, params?: Record<string, unknown>): Buf
export default pinkNoise
