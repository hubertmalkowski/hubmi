import type { ReactNode } from 'react';
import {
	AbsoluteFill,
	Audio,
	Freeze,
	getStaticFiles,
	OffthreadVideo,
	Sequence,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig
} from 'remotion';
import { Background } from './components/Background';
import { BrowserFrame, BAR } from './components/BrowserFrame';
import { Callout, Pulse } from './components/Callout';
import type { Key } from './components/Camera';
import { Caption } from './components/Caption';
import { Footage, segmentsLength, sourceTime, type Segment } from './components/Footage';
import voiceover from './voiceover.json';
import { Logo } from './components/Logo';
import { C, FPS, PAGE, SANS, SERIF, clamp01, easeInOut } from './theme';

// Transition length; long enough that moves read as calm, not snappy.
const OVERLAP = 22;

type Move = 'tilt' | 'whip' | 'zoom' | 'rise' | 'none';

const SCALE = 0.9;
const FRAME_W = PAGE.w * SCALE;
const FRAME_H = (PAGE.h + BAR) * SCALE;
const FRAME_X = (1920 - FRAME_W) / 2;
const FRAME_Y = 46; // leaves room for the caption bar underneath

/** Positions the browser window and runs its enter/exit move. */
function Shot({
	duration,
	enter,
	exit,
	children
}: {
	duration: number;
	enter: Move;
	exit: Move;
	children: ReactNode;
}) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const inK =
		enter === 'tilt'
			? spring({ frame, fps, config: { damping: 24, mass: 1.2 }, durationInFrames: 50 })
			: easeInOut(clamp01(frame / OVERLAP));
	const outK = easeInOut(clamp01((frame - (duration - OVERLAP)) / OVERLAP));

	let tx = 0,
		ty = 0,
		s = 1,
		rx = 0,
		ry = 0,
		o = 1,
		blurX = 0;
	if (enter === 'tilt') {
		rx = (1 - inK) * 28;
		ry = (1 - inK) * -20;
		s *= 0.62 + 0.38 * inK;
		ty += (1 - inK) * 260;
		o *= clamp01(inK * 3);
	} else if (enter === 'whip') {
		tx += (1 - inK) * 1900;
		blurX += Math.sin(inK * Math.PI) * 24;
	} else if (enter === 'zoom') {
		s *= 0.75 + 0.25 * inK;
		o *= inK;
	} else if (enter === 'rise') {
		ty += (1 - inK) * 700;
	}
	if (exit === 'whip') {
		tx -= outK * 1900;
		blurX += Math.sin(outK * Math.PI) * 24;
	} else if (exit === 'zoom') {
		s *= 1 + outK * 1.4;
		o *= 1 - outK;
	} else if (exit === 'rise') {
		ty -= outK * 900;
		s *= 1 - outK * 0.1;
	}
	return (
		<AbsoluteFill style={{ perspective: 2200 }}>
			{blurX > 0.5 && (
				<svg width="0" height="0" style={{ position: 'absolute' }}>
					<filter id={`whip-${Math.round(blurX)}`} x="-10%" y="0" width="120%" height="100%">
						<feGaussianBlur stdDeviation={`${blurX} 0`} />
					</filter>
				</svg>
			)}
			<div
				style={{
					position: 'absolute',
					left: FRAME_X,
					top: FRAME_Y,
					width: FRAME_W,
					height: FRAME_H,
					transform: `translate(${tx}px, ${ty}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`,
					opacity: o,
					filter: blurX > 0.5 ? `url(#whip-${Math.round(blurX)})` : undefined
				}}
			>
				<div style={{ transform: `scale(${SCALE})`, transformOrigin: '0 0' }}>{children}</div>
			</div>
		</AbsoluteFill>
	);
}

/** Soft white fade, used where the page navigates inside a shot. */
function Flash({ at }: { at: number }) {
	const frame = useCurrentFrame();
	const o = interpolate(frame, [at - 6, at, at + 12], [0, 0.3, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});
	return o > 0 ? <AbsoluteFill style={{ background: C.white, opacity: o }} /> : null;
}

// ---------- Timeline, driven by the voiceover paragraphs ----------
// Voice starts after the logo has appeared. Each scene begins just before its paragraph,
// so the cut lands in the pause between paragraphs.
const VO_START = 1.5;
const P = (i: number) => VO_START + voiceover.paragraphs[i].start;
const OV = OVERLAP / FPS;
const STARTS = {
	intro: 0,
	report: 4.6,
	map: P(2) - 0.5,
	challenges: P(2) + 7.2,
	trends: P(3) - 0.5,
	a11y: P(4) - 0.5,
	outro: P(5) - 0.6
};
const END = VO_START + voiceover.duration + 1.6;
export const DURATION = Math.round(END * FPS);
const f = (sec: number) => Math.round(sec * FPS);
/** Scene length in frames: until the next scene has finished coming in. */
const len = (from: number, next: number) => f(next + OV - from);

/** Pads a segment list with a trailing hold so it fills `frames`. */
const fill = (segs: Segment[], frames: number): Segment[] => {
	const rest = frames - segmentsLength(segs);
	return rest > 0 ? [...segs, { hold: rest / FPS }] : segs;
};
/** Inverse of sourceTime: first scene frame showing source time t. */
const at = (segs: Segment[], t: number) => {
	for (let i = 0; i < 4000; i++) if (sourceTime(segs, i) >= t) return i;
	return 0;
};

// ---------- Scene 1: intro ----------
function Intro({ duration }: { duration: number }) {
	const frame = useCurrentFrame();
	const out = easeInOut(clamp01((frame - (duration - OVERLAP - 4)) / (OVERLAP + 4)));
	return (
		<AbsoluteFill
			style={{
				alignItems: 'center',
				justifyContent: 'center',
				opacity: 1 - out,
				transform: `scale(${1 + out * 0.25}) translateY(${-out * 80}px)`,
				filter: `blur(${out * 12}px)`
			}}
		>
			<Logo start={2} tagline="Opisz problem. Znajdź sprawdzone rozwiązanie." />
		</AbsoluteFill>
	);
}

// ---------- Scene 2: resident report (home → results, one continuous recording) ----------
const REPORT_LEN = len(STARTS.report, STARTS.map);
// Typing starts with "Pani Ania opisuje to w Zaczynie…".
const TYPING_AT = P(1) + 0.1 - STARTS.report;
const REPORT: Segment[] = fill(
	[
		{ from: 0.6, to: 2.55, rate: 0.6 }, // page reveals, cursor moves to the field
		{ hold: Math.max(0, TYPING_AT - 1.95 / 0.6) }, // wait for the paragraph
		{ from: 2.55, to: 7.3, rate: 1.3 }, // typing
		{ from: 7.3, to: 16.3, rate: 1.0 } // gmina + Library preview, submit, match
	],
	REPORT_LEN
);
const REPORT_CAM: Key[] = [
	{ t: 0.6, x: 800, y: 450, s: 1 },
	{ t: 2.55, x: 800, y: 450, s: 1 },
	{ t: 3.5, x: 800, y: 470, s: 1.4 },
	{ t: 7.0, x: 800, y: 480, s: 1.4 },
	{ t: 7.9, x: 800, y: 640, s: 1.2 },
	{ t: 9.6, x: 800, y: 640, s: 1.2 },
	{ t: 10.5, x: 800, y: 450, s: 1 }, // back to full view before the click
	{ t: 12.8, x: 800, y: 450, s: 1 },
	{ t: 13.8, x: 660, y: 680, s: 1.25 },
	{ t: 17.5, x: 660, y: 690, s: 1.28 }
];

function Report({ duration }: { duration: number }) {
	return (
		<>
			<Shot duration={duration} enter="tilt" exit="whip">
				<BrowserFrame path={useCurrentFrame() < at(REPORT, 10.95) ? '/' : '/report/…'}>
					<Footage clip="report" segments={REPORT} camera={REPORT_CAM}>
						<Callout box={{ x: 464, y: 616, w: 672, h: 180 }} t0={8.6} t1={10.3} dim={0.3} />
						<Callout box={{ x: 248, y: 501, w: 784, h: 371 }} t0={13.6} t1={17.5} dim={0.3} />
					</Footage>
				</BrowserFrame>
			</Shot>
			<Flash at={at(REPORT, 10.95)} />
			<Caption
				kicker="Mieszkanka"
				text="Opisuje problem *własnymi* słowami"
				from={at(REPORT, 2.6)}
				to={at(REPORT, 7.4)}
			/>
			<Caption
				kicker="Na bieżąco"
				text="Gmina i *podobne* rozwiązania"
				from={at(REPORT, 8.3)}
				to={at(REPORT, 10.7)}
			/>
			<Caption
				kicker="Biblioteka Innowacji"
				text="Rozwiązanie, które *już działa*"
				from={at(REPORT, 13.5)}
				to={duration - 12}
			/>
		</>
	);
}

// ---------- Scene 3: challenge map ----------
const MAP_LEN = len(STARTS.map, STARTS.challenges);
const MAP: Segment[] = fill([{ from: 1.0, to: 6.95, rate: 1.0 }], MAP_LEN);
const MAP_CAM: Key[] = [
	{ t: 1.0, x: 800, y: 450, s: 1 },
	{ t: 3.3, x: 800, y: 450, s: 1.02 },
	{ t: 4.5, x: 640, y: 470, s: 1.35 },
	{ t: 9.0, x: 630, y: 470, s: 1.42 }
];
function MapScene({ duration }: { duration: number }) {
	return (
		<>
			<Shot duration={duration} enter="whip" exit="whip">
				<BrowserFrame path="/knowledge">
					<Footage clip="map" segments={MAP} camera={MAP_CAM}>
						<Pulse x={612} y={445} t0={4.3} t1={99} />
					</Footage>
				</BrowserFrame>
			</Shot>
			<Caption
				kicker="Brak rozwiązania?"
				text="Powstaje *otwarte wyzwanie*"
				from={14}
				to={duration - 12}
			/>
		</>
	);
}

// ---------- Scene 4: open challenges ----------
const CHALLENGES_LEN = len(STARTS.challenges, STARTS.trends);
const CHALLENGES: Segment[] = fill([{ from: 0.6, to: 5.85, rate: 1.0 }], CHALLENGES_LEN);
const CHALLENGES_CAM: Key[] = [
	{ t: 0.6, x: 800, y: 450, s: 1 },
	{ t: 3.4, x: 800, y: 450, s: 1 },
	{ t: 4.5, x: 520, y: 330, s: 1.3 },
	{ t: 8.0, x: 520, y: 330, s: 1.35 }
];
function ChallengesScene({ duration }: { duration: number }) {
	return (
		<>
			<Shot duration={duration} enter="whip" exit="zoom">
				<BrowserFrame path="/challenges">
					<Footage clip="challenges" segments={CHALLENGES} camera={CHALLENGES_CAM}>
						<Callout box={{ x: 248, y: 340, w: 540, h: 244 }} t0={4.3} t1={99} dim={0.3} />
					</Footage>
				</BrowserFrame>
			</Shot>
			<Caption
				kicker="Innowatorzy"
				text="Organizacje i gminy *zgłaszają pomysły*"
				from={14}
				to={duration - 12}
			/>
		</>
	);
}

// ---------- Scene 5: ROPS trends ----------
const TRENDS_LEN = len(STARTS.trends, STARTS.a11y);
const TRENDS: Segment[] = fill([{ from: 0.2, to: 5.25, rate: 0.8 }], TRENDS_LEN);
const TRENDS_CAM: Key[] = [
	{ t: 0.2, x: 800, y: 300, s: 1.08 },
	{ t: 6.5, x: 800, y: 450, s: 1 }
];
function TrendsScene({ duration }: { duration: number }) {
	return (
		<>
			<Shot duration={duration} enter="zoom" exit="rise">
				<BrowserFrame path="/admin/trends">
					<Footage clip="trends" segments={TRENDS} camera={TRENDS_CAM} />
				</BrowserFrame>
			</Shot>
			<Caption
				kicker="Zespół ROPS"
				text="Trendy i luki *w całym regionie*"
				from={14}
				to={duration - 14}
			/>
		</>
	);
}

// ---------- Scene 6: accessibility split ----------
// The camera moves to the large-text panel on "osoba słabowidząca"
// and to the Ukrainian panel on "ktoś, kto dopiero uczy się polskiego".
const A11Y_LEN = len(STARTS.a11y, STARTS.outro);
const A11Y_FOCUS = [f(P(4) + 3.2 - STARTS.a11y), f(P(4) + 5.8 - STARTS.a11y)];
function A11yScene({ duration }: { duration: number }) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const panels = [
		{ clip: 'a11y-contrast', label: 'Większy tekst i kontrast', dark: false, path: '/' },
		{ clip: 'a11y-dark', label: 'Tryb ciemny', dark: true, path: '/' },
		{ clip: 'a11y-uk', label: 'Українська', dark: false, path: '/uk' }
	];
	const out = easeInOut(clamp01((frame - (duration - OVERLAP)) / OVERLAP));
	const head = spring({ frame: frame - 4, fps, config: { damping: 18 } });
	const scale = 0.335;
	const w = PAGE.w * scale,
		h = (PAGE.h + BAR) * scale,
		gap = 36,
		top = 460;
	const left = (1920 - (w * 3 + gap * 2)) / 2;

	// Camera over the panels: overview → panel 0 → panel 2.
	const center = (i: number) => ({ x: left + i * (w + gap) + w / 2, y: top + h / 2 + 30, s: 2.1 });
	const overview = { x: 960, y: 540, s: 1 };
	const ease = (a: number, b: number) => easeInOut(clamp01((frame - a) / (b - a)));
	const k1 = ease(A11Y_FOCUS[0] - 14, A11Y_FOCUS[0] + 16);
	const k2 = ease(A11Y_FOCUS[1] - 14, A11Y_FOCUS[1] + 16);
	const p0 = center(0),
		p2 = center(2);
	const mix = (a: number, b: number, k: number) => a + (b - a) * k;
	const cam = {
		x: mix(mix(overview.x, p0.x, k1), p2.x, k2),
		y: mix(mix(overview.y, p0.y, k1), p2.y, k2),
		s: mix(mix(overview.s, p0.s, k1), p2.s, k2)
	};
	return (
		<AbsoluteFill
			style={{
				opacity: 1 - out,
				transform: `scale(${1 - out * 0.12})`,
				filter: `blur(${out * 10}px)`
			}}
		>
			<AbsoluteFill
				style={{
					transformOrigin: '0 0',
					transform: `translate(${960 - cam.x * cam.s}px, ${540 - cam.y * cam.s}px) scale(${cam.s})`
				}}
			>
				<div
					style={{
						position: 'absolute',
						top: 220,
						width: '100%',
						textAlign: 'center',
						opacity: head * (1 - k1),
						transform: `translateY(${(1 - head) * 30}px)`
					}}
				>
					<div
						style={{
							fontFamily: SANS,
							fontWeight: 700,
							fontSize: 22,
							letterSpacing: '0.14em',
							textTransform: 'uppercase',
							color: C.yellow
						}}
					>
						WCAG 2.1 AA · PL / EN / UK
					</div>
					<div
						style={{
							fontFamily: SERIF,
							fontWeight: 600,
							fontSize: 68,
							color: C.white,
							marginTop: 10
						}}
					>
						Dostępny dla każdego
					</div>
				</div>
				{panels.map((p, i) => {
					const s = spring({ frame: frame - 8 - i * 8, fps, config: { damping: 20, mass: 1 } });
					return (
						<div
							key={p.clip}
							style={{
								position: 'absolute',
								left: left + i * (w + gap),
								top,
								width: w,
								transform: `translateY(${(1 - s) * 500}px) rotate(${(1 - s) * (i - 1) * 6}deg)`,
								opacity: clamp01(s * 2)
							}}
						>
							<div style={{ width: w, height: h }}>
								<div
									style={{
										transform: `scale(${scale})`,
										transformOrigin: '0 0',
										width: PAGE.w,
										height: PAGE.h + BAR
									}}
								>
									<BrowserFrame path={p.path} dark={p.dark}>
										{/* clips are ~4 s long; hold the last frame after that */}
										<Freeze frame={Math.min(frame, 90)}>
											<OffthreadVideo
												src={staticFile(`clips/${p.clip}.mp4`)}
												trimBefore={Math.round(0.9 * FPS)}
												muted
												style={{ width: PAGE.w, height: PAGE.h }}
											/>
										</Freeze>
									</BrowserFrame>
								</div>
							</div>
							<div
								style={{
									marginTop: 30,
									textAlign: 'center',
									fontFamily: SANS,
									fontWeight: 600,
									fontSize: 30,
									color: C.white
								}}
							>
								{p.label}
							</div>
						</div>
					);
				})}
			</AbsoluteFill>
		</AbsoluteFill>
	);
}

// ---------- Scene 7: outro wall + logo ----------
// The logo lands on "Zaczyn pomaga to rozwiązanie znaleźć".
const OUTRO_LOGO = f(P(5) + 3.0 - STARTS.outro);
const WALL = [
	['report', 9.8],
	['map', 6.0],
	['challenges', 5.0],
	['report', 15.5],
	['trends', 4.0],
	['a11y-uk', 3.0]
] as const;
function Outro() {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const zoom = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 60 });
	const cover = easeInOut(clamp01((frame - (OUTRO_LOGO - 30)) / 30));
	const tw = 480,
		th = 270,
		gap = 26;
	const gw = tw * 3 + gap * 2,
		gh = th * 2 + gap;
	return (
		<AbsoluteFill>
			<AbsoluteFill
				style={{
					alignItems: 'center',
					justifyContent: 'center',
					transform: `scale(${2.6 - 1.55 * zoom}) rotate(${(1 - zoom) * -4}deg)`,
					filter: `blur(${cover * 10}px)`,
					opacity: 1 - cover * 0.75
				}}
			>
				<div style={{ position: 'relative', width: gw, height: gh }}>
					{WALL.map(([clip, t], i) => (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: (i % 3) * (tw + gap),
								top: Math.floor(i / 3) * (th + gap),
								width: tw,
								height: th,
								borderRadius: 14,
								overflow: 'hidden',
								boxShadow: '0 20px 50px rgba(2,8,23,.5)'
							}}
						>
							<Freeze frame={Math.round(t * FPS)}>
								<OffthreadVideo
									src={staticFile(`clips/${clip}.mp4`)}
									muted
									style={{ width: tw, height: th }}
								/>
							</Freeze>
						</div>
					))}
				</div>
			</AbsoluteFill>
			<AbsoluteFill
				style={{
					background: `radial-gradient(60% 60% at 50% 50%, rgba(8,21,47,.55), rgba(8,21,47,.85))`,
					opacity: cover
				}}
			/>
			<Sequence from={OUTRO_LOGO} layout="none">
				<AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
					<Logo size={0.82} tagline="Małopolski Hub Innowacji Społecznych" />
				</AbsoluteFill>
				<OutroFooter />
			</Sequence>
		</AbsoluteFill>
	);
}
function OutroFooter() {
	const frame = useCurrentFrame();
	const o = interpolate(frame, [28, 42], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});
	return (
		<div
			style={{
				position: 'absolute',
				bottom: 110,
				width: '100%',
				textAlign: 'center',
				fontFamily: SANS,
				fontWeight: 600,
				fontSize: 26,
				letterSpacing: '0.16em',
				textTransform: 'uppercase',
				color: C.yellow,
				opacity: o
			}}
		>
			HackYeah · Wyzwanie ROPS Kraków
		</div>
	);
}

const MUSIC = 'audio/music.mp3';
const VOICE = 'audio/voiceover.wav';

/** Music volume: lower under each voice paragraph, fade in and out. */
function musicVolume(frame: number) {
	const t = frame / FPS;
	const ramp = 0.25;
	let duck = 0;
	for (const p of voiceover.paragraphs) {
		const a = VO_START + p.start,
			b = VO_START + p.end;
		duck = Math.max(
			duck,
			Math.min(clamp01((t - (a - ramp)) / ramp), clamp01((b + ramp - t) / ramp))
		);
	}
	const fade = Math.min(clamp01(t / 0.5), clamp01((END - t) / 1.5));
	return (0.35 - 0.25 * duck) * fade;
}

const scenes: [string, number, number, (p: { duration: number }) => ReactNode][] = [
	['intro', STARTS.intro, f(STARTS.report + 0.8), Intro],
	['report', STARTS.report, REPORT_LEN, Report],
	['map', STARTS.map, MAP_LEN, MapScene],
	['challenges', STARTS.challenges, CHALLENGES_LEN, ChallengesScene],
	['trends', STARTS.trends, TRENDS_LEN, TrendsScene],
	['a11y', STARTS.a11y, A11Y_LEN, A11yScene],
	['outro', STARTS.outro, f(END - STARTS.outro), Outro]
];

export function Main() {
	const files = new Set(getStaticFiles().map((s) => s.name));
	return (
		<AbsoluteFill style={{ background: C.navyDeep }}>
			<Background />
			{scenes.map(([name, start, frames, Comp]) => (
				<Sequence key={name} name={name} from={f(start)} durationInFrames={frames}>
					<Comp duration={frames} />
				</Sequence>
			))}
			{files.has(VOICE) && (
				<Sequence name="voiceover" from={f(VO_START)}>
					<Audio src={staticFile(VOICE)} />
				</Sequence>
			)}
			{files.has(MUSIC) && <Audio src={staticFile(MUSIC)} volume={musicVolume} />}
		</AbsoluteFill>
	);
}
