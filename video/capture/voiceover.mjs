// Cleans the recorded voiceover and writes paragraph timings for the composition.
// Usage (from the repo root): node video/capture/voiceover.mjs path/to/recording.wav
//
// - denoise, high-pass, gentle compression, loudness to -16 LUFS, mono 48 kHz
// - finds speech by loudness, shortens long pauses (sentence pauses to PAUSE, paragraph breaks to BREAK)
// - writes video/public/audio/voiceover.wav and video/src/voiceover.json
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const input = process.argv[2];
if (!input) throw new Error('usage: node video/capture/voiceover.mjs <recording>');

// Paragraph breaks in the raw recording (seconds), one between each pair of the script's paragraphs.
// Found from the pause pattern; adjust if the recording changes.
const BREAKS = [8.6, 22.2, 37.5, 46.0, 58.4];
const PAUSE = 0.4; // longest pause kept inside a paragraph
const BREAK = 0.8; // pause kept between paragraphs (scene cuts land here)
const PAD = 0.08; // kept around each speech run
const STEP = 0.02; // loudness envelope resolution
const SPEECH_DB = -42;

const tmp = mkdtempSync(join(tmpdir(), 'vo-'));
const ff = (args) =>
	execFileSync('ffmpeg', ['-hide_banner', '-y', ...args], { maxBuffer: 1 << 28 }).toString();

// 1. Clean the whole take first so the envelope sees the denoised signal.
const clean = join(tmp, 'clean.wav');
ff([
	'-loglevel',
	'error',
	'-i',
	input,
	'-ac',
	'1',
	'-ar',
	'48000',
	'-af',
	'highpass=f=80,afftdn=nr=12:nf=-45,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150',
	clean
]);

// 2. Loudness envelope.
const n = Math.round(48000 * STEP);
const out = execFileSync(
	'sh',
	[
		'-c',
		`ffmpeg -hide_banner -i "${clean}" -af "asetnsamples=n=${n},astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null - 2>&1`
	],
	{ maxBuffer: 1 << 28 }
).toString();
const levels = [...out.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) =>
	m[1] === '-inf' ? -120 : +m[1]
);

// 3. Speech runs (merge dips shorter than 0.25 s).
let runs = [];
levels.forEach((db, i) => {
	if (db < SPEECH_DB) return;
	const t = i * STEP;
	const last = runs.at(-1);
	if (last && t - last[1] < 0.25) last[1] = t + STEP;
	else runs.push([t, t + STEP]);
});
runs = runs.filter(([a, b]) => b - a >= 0.12).map(([a, b]) => [Math.max(0, a - PAD), b + PAD]);

// 4. Rebuild the timeline with shortened pauses, tracking where each paragraph lands.
const parts = [];
const paragraphs = [{ start: 0, end: 0 }];
let t = 0;
let p = 0;
runs.forEach(([a, b], i) => {
	if (i > 0) {
		const gap = a - runs[i - 1][1];
		const isBreak = p < BREAKS.length && runs[i - 1][1] <= BREAKS[p] && a >= BREAKS[p];
		const keep = isBreak ? BREAK : Math.min(gap, PAUSE);
		if (keep > 0) parts.push({ silence: keep });
		t += Math.max(keep, 0);
		if (isBreak) {
			paragraphs.at(-1).end = +(t - keep).toFixed(3);
			paragraphs.push({ start: +t.toFixed(3), end: 0 });
			p++;
		}
	} else {
		paragraphs[0].start = 0;
	}
	parts.push({ from: a, to: b });
	t += b - a;
});
paragraphs.at(-1).end = +t.toFixed(3);
if (paragraphs.length !== BREAKS.length + 1)
	throw new Error(`found ${paragraphs.length} paragraphs, expected ${BREAKS.length + 1}`);

// 5. Cut, join, normalise.
const inputs = [];
const labels = [];
parts.forEach((part, i) => {
	if ('silence' in part) {
		inputs.push(`anullsrc=r=48000:cl=mono,atrim=duration=${part.silence.toFixed(3)}[s${i}]`);
	} else {
		inputs.push(
			`[0:a]atrim=start=${part.from.toFixed(3)}:end=${part.to.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st=${(part.to - part.from - 0.03).toFixed(3)}:d=0.03[s${i}]`
		);
	}
	labels.push(`[s${i}]`);
});
const graph = `${inputs.join(';')};${labels.join('')}concat=n=${labels.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=9[out]`;
mkdirSync(join(ROOT, 'public', 'audio'), { recursive: true });
const dest = join(ROOT, 'public', 'audio', 'voiceover.wav');
ff([
	'-loglevel',
	'error',
	'-i',
	clean,
	'-filter_complex',
	graph,
	'-map',
	'[out]',
	'-ar',
	'48000',
	'-ac',
	'1',
	dest
]);
rmSync(tmp, { recursive: true, force: true });

const duration = +t.toFixed(3);
writeFileSync(
	join(ROOT, 'src', 'voiceover.json'),
	JSON.stringify({ duration, paragraphs }, null, '\t') + '\n'
);
console.log(
	`voiceover: ${duration}s, paragraphs:`,
	paragraphs.map((x) => `${x.start}-${x.end}`).join(' ')
);
