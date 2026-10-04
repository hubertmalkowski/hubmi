import type { ReactNode } from 'react';
import { Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { FPS, PAGE } from '../theme';
import { Camera, type Key } from './Camera';
import { SourceTime } from './source-time';

/**
 * A stretch of a recorded clip played at `rate` (source seconds), or a `hold` (seconds) that
 * freezes the previous segment's last frame. During a hold, source time keeps counting past the
 * frozen frame, so camera keys and overlays can be placed there.
 */
export type Segment = { from: number; to: number; rate: number } | { hold: number };

const frames = (s: Segment) =>
	'hold' in s ? Math.round(s.hold * FPS) : Math.round(((s.to - s.from) / s.rate) * FPS);

export const segmentsLength = (segs: Segment[]) => segs.reduce((n, s) => n + frames(s), 0);

/** Maps a scene frame to the clip time being shown, so overlays can be keyed to clip time. */
export function sourceTime(segs: Segment[], frame: number) {
	let start = 0;
	let t = 0;
	for (const s of segs) {
		const len = frames(s);
		if ('hold' in s) {
			if (frame < start + len) return t + (frame - start) / FPS;
			t += s.hold;
		} else {
			if (frame < start + len) return s.from + ((frame - start) / FPS) * s.rate;
			t = s.to;
		}
		start += len;
	}
	return t;
}

/**
 * Plays a clip as consecutive segments with their own speeds, at page size (1600x900),
 * through a camera. Children are overlays in page coordinates.
 */
export function Footage({
	clip,
	segments,
	camera,
	children
}: {
	clip: string;
	segments: Segment[];
	camera: Key[];
	children?: ReactNode;
}) {
	const frame = useCurrentFrame();
	const src = staticFile(`clips/${clip}.mp4`);
	const style = { position: 'absolute', inset: 0, width: PAGE.w, height: PAGE.h } as const;
	let start = 0;
	let last = 0;
	const parts = segments.map((s, i) => {
		const len = frames(s);
		const el =
			'hold' in s ? (
				<Sequence key={i} from={start} durationInFrames={len} layout="none">
					<Freeze frame={last}>
						<OffthreadVideo src={src} muted style={style} />
					</Freeze>
				</Sequence>
			) : (
				<Sequence key={i} from={start} durationInFrames={len} layout="none">
					<OffthreadVideo
						src={src}
						trimBefore={Math.round(s.from * FPS)}
						playbackRate={s.rate}
						muted
						style={style}
					/>
				</Sequence>
			);
		if (!('hold' in s)) last = Math.round(s.to * FPS) - 1;
		start += len;
		return el;
	});
	return (
		<SourceTime.Provider value={sourceTime(segments, frame)}>
			<Camera keys={camera}>
				{parts}
				{children}
			</Camera>
		</SourceTime.Provider>
	);
}
