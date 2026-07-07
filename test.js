import test, { almost, ok } from 'tst'
import pinkNoise from '@audio/synth-noise'
const audio = { pinkNoise }
import { dftMag, magDB, impulse, dc, EPSILON } from './test/util.js'

test('pinkNoise — produces output', () => {
	let data = new Float64Array(256)
	for (let i = 0; i < 256; i++) data[i] = Math.random() * 2 - 1
	audio.pinkNoise(data, {})
	let hasOutput = data.some(x => Math.abs(x) > 0.01)
	ok(hasOutput, 'pink noise has output')
})

test('pinkNoise — spectral slope ~-3dB/octave', () => {
	let N = 65536, fs = 44100
	let data = new Float64Array(N)
	let seed = 12345
	for (let i = 0; i < N; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; data[i] = (seed / 0x7fffffff) * 2 - 1 }
	audio.pinkNoise(data, {})
	let powerLow = 0, powerHigh = 0, countLow = 0, countHigh = 0, binSize = fs / N
	for (let f = 200; f < 400; f += binSize) { let m = dftMag(data, f, fs); powerLow += m * m; countLow++ }
	for (let f = 1600; f < 3200; f += binSize) { let m = dftMag(data, f, fs); powerHigh += m * m; countHigh++ }
	let diffDB = 10 * Math.log10((powerLow / countLow) / (powerHigh / countHigh))
	ok(diffDB > 4 && diffDB < 15, `pink noise slope: ${diffDB.toFixed(1)}dB (expect ~9dB)`)
})

