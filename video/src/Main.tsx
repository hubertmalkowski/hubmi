import type { ReactNode } from 'react';
import {
	AbsoluteFill,
	Freeze,
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
const REPORT: Segment[] = [
	{ from: 0.6, to: 2.4, rate: 1.0 }, // page reveals, cursor moves to the field
	{ from: 2.4, to: 7.2, rate: 1.5 }, // typing
	{ from: 7.2, to: 10.85, rate: 1.0 }, // gmina detected, Library preview, PII warning, submit
	{ from: 10.85, to: 12.2, rate: 1.0 }, // "Usuwamy dane osobowe..."
	{ from: 12.2, to: 16.6, rate: 1.0 }, // redacted report + match
	{ hold: 1.2 } // rest on the match (source time runs on to 17.8)
];
// Every move takes about a second on screen, with holds in between.
const REPORT_CAM: Key[] = [
	{ t: 0.6, x: 800, y: 450, s: 1 },
	{ t: 2.6, x: 800, y: 450, s: 1 },
	{ t: 3.6, x: 800, y: 470, s: 1.4 },
	{ t: 6.8, x: 800, y: 480, s: 1.4 },
	{ t: 7.9, x: 800, y: 640, s: 1.2 },
	{ t: 9.4, x: 800, y: 640, s: 1.2 },
	{ t: 10.4, x: 800, y: 450, s: 1 }, // back to full view before the click, no punch-in
	{ t: 12.4, x: 800, y: 450, s: 1 },
	{ t: 13.4, x: 640, y: 300, s: 1.35 },
	{ t: 14.6, x: 640, y: 300, s: 1.35 },
	{ t: 15.6, x: 660, y: 650, s: 1.25 },
	{ t: 17.8, x: 660, y: 660, s: 1.28 }
];
const at = (segs: Segment[], t: number) => {
	// Inverse of sourceTime: first scene frame showing source time t.
	for (let f = 0; f < 2000; f++) if (sourceTime(segs, f) >= t) return f;
	return 0;
};

function Report({ duration }: { duration: number }) {
	return (
		<>
			<Shot duration={duration} enter="tilt" exit="whip">
				<BrowserFrame path={useCurrentFrame() < at(REPORT, 10.85) ? '/' : '/report/…'}>
					<Footage clip="report" segments={REPORT} camera={REPORT_CAM}>
						<Callout box={{ x: 464, y: 616, w: 672, h: 260 }} t0={8.5} t1={10.2} dim={0.3} />
						<Callout box={{ x: 248, y: 228, w: 784, h: 65 }} t0={13.3} t1={15.1} />
						<Callout box={{ x: 248, y: 501, w: 784, h: 341 }} t0={15.6} t1={17.8} dim={0.3} />
					</Footage>
				</BrowserFrame>
			</Shot>
			<Flash at={at(REPORT, 10.85)} />
			<Caption
				kicker="Mieszkaniec"
				text="Opisuje problem *własnymi* słowami"
				from={at(REPORT, 2.6)}
				to={at(REPORT, 7.5)}
			/>
			<Caption
				kicker="Na bieżąco"
				text="Rozpoznana gmina i *podobne* rozwiązania"
				from={at(REPORT, 7.8)}
				to={at(REPORT, 10.5)}
			/>
			<Caption
				kicker="Prywatność"
				text="Dane osobowe usunięte *automatycznie*"
				from={at(REPORT, 12.6)}
				to={at(REPORT, 15.1)}
			/>
			<Caption
				kicker="Biblioteka Innowacji"
				text="Sprawdzone rozwiązanie *z Małopolski*"
				from={at(REPORT, 15.4)}
				to={duration - 10}
			/>
		</>
	);
}

// ---------- Scene 3: challenge map ----------
const MAP: Segment[] = [{ from: 1.0, to: 6.95, rate: 1.0 }, { hold: 0.6 }];
const MAP_CAM: Key[] = [
	{ t: 1.0, x: 800, y: 450, s: 1 },
	{ t: 3.3, x: 800, y: 450, s: 1.02 },
	{ t: 4.5, x: 640, y: 470, s: 1.35 },
	{ t: 7.55, x: 630, y: 470, s: 1.4 }
];
function MapScene({ duration }: { duration: number }) {
	return (
		<>
			<Shot duration={duration} enter="whip" exit="whip">
				<BrowserFrame path="/knowledge">
					<Footage clip="map" segments={MAP} camera={MAP_CAM}>
						<Pulse x={612} y={445} t0={4.3} t1={7.55} />
					</Footage>
				</BrowserFrame>
			</Shot>
			<Caption
				kicker="Brak rozwiązania?"
				text="Powstaje *otwarte wyzwanie* na mapie regionu"
				from={14}
				to={duration - 10}
			/>
		</>
	);
}

// ---------- Scene 4: open challenges ----------
const CHALLENGES: Segment[] = [{ from: 0.6, to: 5.85, rate: 1.0 }, { hold: 0.5 }];
const CHALLENGES_CAM: Key[] = [
	{ t: 0.6, x: 800, y: 450, s: 1 },
	{ t: 3.4, x: 800, y: 450, s: 1 },
	{ t: 4.5, x: 520, y: 330, s: 1.3 },
	{ t: 6.35, x: 520, y: 330, s: 1.33 }
];
function ChallengesScene({ duration }: { duration: number }) {
	return (
		<>
			<Shot duration={duration} enter="whip" exit="zoom">
				<BrowserFrame path="/challenges">
					<Footage clip="challenges" segments={CHALLENGES} camera={CHALLENGES_CAM}>
						<Callout box={{ x: 248, y: 340, w: 540, h: 244 }} t0={4.3} t1={6.35} dim={0.3} />
					</Footage>
				</BrowserFrame>
			</Shot>
			<Caption
				kicker="Innowatorzy"
				text="Organizacje i gminy *zgłaszają pomysły*"
				from={14}
				to={duration - 10}
			/>
		</>
	);
}

// ---------- Scene 5: ROPS trends ----------
const TRENDS: Segment[] = [{ from: 0.2, to: 5.25, rate: 1.0 }, { hold: 0.4 }];
const TRENDS_CAM: Key[] = [
	{ t: 0.2, x: 800, y: 300, s: 1.08 },
	{ t: 5.65, x: 800, y: 450, s: 1 }
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
				to={duration - 12}
			/>
		</>
	);
}

// ---------- Scene 6: accessibility split ----------
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
		gap = 36;
	const left = (1920 - (w * 3 + gap * 2)) / 2;
	return (
		<AbsoluteFill
			style={{
				opacity: 1 - out,
				transform: `scale(${1 - out * 0.12})`,
				filter: `blur(${out * 10}px)`
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 220,
					width: '100%',
					textAlign: 'center',
					opacity: head,
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
							top: 460,
							width: w,
							transform: `translateY(${(1 - s) * 500}px) rotate(${(1 - s) * (i - 1) * 6}deg)`,
							opacity: clamp01(s * 2)
						}}
					>
						<div style={{ width: w, height: (PAGE.h + BAR) * scale }}>
							<div
								style={{
									transform: `scale(${scale})`,
									transformOrigin: '0 0',
									width: PAGE.w,
									height: PAGE.h + BAR
								}}
							>
								<BrowserFrame path={p.path} dark={p.dark}>
									<OffthreadVideo
										src={staticFile(`clips/${p.clip}.mp4`)}
										trimBefore={Math.round(0.9 * FPS)}
										muted
										style={{ width: PAGE.w, height: PAGE.h }}
									/>
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
	);
}

// ---------- Scene 7: outro wall + logo ----------
const WALL = [
	['report', 9.8],
	['map', 6.0],
	['challenges', 5.0],
	['report', 16.0],
	['trends', 4.0],
	['a11y-uk', 3.0]
] as const;
function Outro() {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const zoom = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 50 });
	const cover = easeInOut(clamp01((frame - 50) / 20));
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
			<Sequence from={56} layout="none">
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

// ---------- Timeline ----------
const scenes: [string, number, (p: { duration: number }) => ReactNode][] = [
	['intro', 90, Intro],
	['report', segmentsLength(REPORT), Report],
	['map', segmentsLength(MAP), MapScene],
	['challenges', segmentsLength(CHALLENGES), ChallengesScene],
	['trends', segmentsLength(TRENDS), TrendsScene],
	['a11y', 130, A11yScene],
	['outro', 0, Outro]
];
let cursor = 0;
const timeline = scenes.map(([name, len, Comp], i) => {
	const from = i === 0 ? 0 : cursor - OVERLAP;
	cursor = from + len;
	return { name, from, len, Comp };
});
export const DURATION = 1230;
// The outro takes whatever is left of the 30 seconds.
timeline.at(-1)!.len = DURATION - timeline.at(-1)!.from;

export function Main() {
	return (
		<AbsoluteFill style={{ background: C.navyDeep }}>
			<Background />
			{timeline.map(({ name, from, len, Comp }) => (
				<Sequence key={name} name={name} from={from} durationInFrames={len}>
					<Comp duration={len} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
}
