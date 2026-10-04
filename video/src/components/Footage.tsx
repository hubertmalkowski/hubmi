import type { ReactNode } from 'react';
import { OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { FPS, PAGE } from '../theme';
import { Camera, type Key } from './Camera';
import { SourceTime } from './source-time';

/** A stretch of a recorded clip, played at `rate` (source seconds). */
export type Segment = { from: number; to: number; rate: number };

export const segmentsLength = (segs: Segment[]) =>
	segs.reduce((n, s) => n + Math.round(((s.to - s.from) / s.rate) * FPS), 0);

/** Maps a scene frame to the clip time being shown, so overlays can be keyed to clip time. */
export function sourceTime(segs: Segment[], frame: number) {
	let start = 0;
	for (const s of segs) {
		const len = Math.round(((s.to - s.from) / s.rate) * FPS);
		if (frame < start + len) return s.from + ((frame - start) / FPS) * s.rate;
		start += len;
	}
	return segs.at(-1)!.to;
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
	let start = 0;
	const parts = segments.map((s, i) => {
		const len = Math.round(((s.to - s.from) / s.rate) * FPS);
		const el = (
			<Sequence key={i} from={start} durationInFrames={len} layout="none">
				<OffthreadVideo
					src={staticFile(`clips/${clip}.mp4`)}
					trimBefore={Math.round(s.from * FPS)}
					playbackRate={s.rate}
					muted
					style={{ position: 'absolute', inset: 0, width: PAGE.w, height: PAGE.h }}
				/>
			</Sequence>
		);
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
