// Reference renderer for the @audio/synth-dx7 differential test: drives the unmodified
// upstream MSFA core (github.com/google/music-synthesizer-for-android, Apache-2.0) one
// Dx7Note at a time and writes the raw int32 engine output. Mirrors SynthUnit's per-block
// order (key-up before the block, then LFO sample, LFO delay, note compute) without its
// resonant filter and int16 clip, which are not part of the FM engine.
//
// Upstream leaves Lfo::phase_/randstate_ and Dx7Note::fb_buf_ uninitialized; value-
// initialization (new T()) zeroes them here, matching the JS port's defined start state.
//
//   msfa-render tables <sr>                               int32 sin, exp2, freq tables
//   msfa-render unpack < voice128.bin                     156 unpacked bytes (VMEM voice)
//   msfa-render note <sr> <note> <vel> <blocks> <keyup> < voice155.bin   int32 blocks of 64

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>

#include "synth.h"
#include "freqlut.h"
#include "exp2.h"
#include "sin.h"
#include "lfo.h"
#include "pitchenv.h"
#include "env.h"
#include "patch.h"
#include "controllers.h"
#include "dx7note.h"

extern int32_t lut[];

static void init (double sr) {
	Freqlut::init(sr);
	Exp2::init();
	Tanh::init();
	Sin::init();
	Lfo::init(sr);
	PitchEnv::init(sr);
}

int main (int argc, char **argv) {
	if (argc < 2) { fprintf(stderr, "usage: see source\n"); return 2; }
	if (!strcmp(argv[1], "tables")) {
		init(atof(argv[2]));
		fwrite(sintab, 4, SIN_N_SAMPLES << 1, stdout);
		fwrite(exp2tab, 4, EXP2_N_SAMPLES << 1, stdout);
		fwrite(lut, 4, 1025, stdout);
		return 0;
	}
	if (!strcmp(argv[1], "unpack")) {
		char bulk[128], patch[156];
		if (fread(bulk, 1, 128, stdin) != 128) return 1;
		UnpackPatch(bulk, patch);
		fwrite(patch, 1, 156, stdout);
		return 0;
	}
	if (!strcmp(argv[1], "note") && argc >= 7) {
		double sr = atof(argv[2]);
		int note = atoi(argv[3]), vel = atoi(argv[4]), blocks = atoi(argv[5]), keyup = atoi(argv[6]);
		char patch[156];
		if (fread(patch, 1, 155, stdin) != 155) return 1;
		patch[155] = 0x3f;
		init(sr);
		Lfo *lfo = new Lfo();
		Dx7Note *dx7 = new Dx7Note();
		Controllers *ctrls = new Controllers();
		ctrls->values_[kControllerPitch] = 0x2000;
		lfo->reset(patch + 137);
		lfo->keydown();
		dx7->init(patch, note, vel);
		int32_t buf[N];
		for (int b = 0; b < blocks; b++) {
			if (b == keyup) dx7->keyup();
			for (int j = 0; j < N; j++) buf[j] = 0;
			int32_t lfoval = lfo->getsample();
			int32_t lfodelay = lfo->getdelay();
			dx7->compute(buf, lfoval, lfodelay, ctrls);
			fwrite(buf, 4, N, stdout);
		}
		return 0;
	}
	fprintf(stderr, "unknown command\n");
	return 2;
}
