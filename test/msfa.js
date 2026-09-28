// Differential-test reference: builds test/msfa-render.cc against the unmodified upstream
// MSFA core (github.com/google/music-synthesizer-for-android, Apache-2.0) and runs it.
// The checkout lives outside the repo, in ~/.cache/audiojs/data/msfa; when it, clang++ or an
// x86-64 execution path is missing, reference() returns null and the tests skip.
//
// The reference is built for x86-64: on AArch64, upstream swaps the operator kernel for a
// NEON float approximation, while the JS port follows the portable fixed-point path.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = join(homedir(), '.cache/audiojs/data')
export const MSFA = join(DATA, 'msfa')
const JNI = join(MSFA, 'app/src/main/jni')
const SRC = join(dirname(fileURLToPath(import.meta.url)), 'msfa-render.cc')
const BIN = join(DATA, 'msfa-build/msfa-render-x86_64')
const CORE = ['dx7note', 'env', 'exp2', 'fm_core', 'fm_op_kernel', 'freqlut', 'lfo', 'pitchenv', 'sin', 'patch']

let cached
/** @returns {null | { tables, unpack, note }} */
export function reference () {
	if (cached !== undefined) return cached
	cached = null
	if (!existsSync(join(JNI, 'dx7note.cc'))) return null
	let x86 = process.arch === 'x64'
	try { if (!x86) execFileSync('arch', ['-x86_64', '/usr/bin/true']); x86 = true } catch { }
	if (!x86) return null
	if (!existsSync(BIN) || statSync(BIN).mtimeMs < statSync(SRC).mtimeMs) {
		mkdirSync(dirname(BIN), { recursive: true })
		let args = ['-O2', '-fwrapv', '-w', ...(process.arch === 'x64' ? [] : ['-arch', 'x86_64']),
			'-I', JNI, '-o', BIN, SRC, ...CORE.map(f => join(JNI, f + '.cc'))]
		// the system compiler first: a Homebrew LLVM clang++ lacks the macOS SDK for x86-64
		let built = ['/usr/bin/clang++', 'clang++', 'g++'].some(cc => {
			try { execFileSync(cc, args, { stdio: 'pipe' }); return true } catch { return false }
		})
		if (!built) return null
	}
	const run = (args, input) => execFileSync(BIN, args, { input, maxBuffer: 1 << 28 })
	const i32 = (buf) => new Int32Array(buf.buffer, buf.byteOffset, buf.length >> 2)
	return cached = {
		tables: (fs) => i32(run(['tables', String(fs)])),
		unpack: (bulk) => new Uint8Array(run(['unpack'], bulk)).subarray(0, 155),
		note: (patch, { note = 60, velocity = 100, fs = 44100, blocks, keyup }) =>
			i32(run(['note', String(fs), String(note), String(velocity), String(blocks), String(keyup)], patch)),
	}
}
