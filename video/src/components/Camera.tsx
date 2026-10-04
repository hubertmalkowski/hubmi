import type { ReactNode } from 'react';
import { PAGE, easeInOut, clamp01 } from '../theme';
import { useSourceTime } from './source-time';

/** Camera keyframe in source seconds: look at page point (x, y) with zoom s. */
export type Key = { t: number; x: number; y: number; s: number };

export function cameraAt(keys: Key[], t: number) {
	if (t <= keys[0].t) return keys[0];
	for (let i = 1; i < keys.length; i++) {
		const a = keys[i - 1],
			b = keys[i];
		if (t <= b.t) {
			const k = easeInOut(clamp01((t - a.t) / (b.t - a.t)));
			return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k };
		}
	}
	return keys.at(-1)!;
}

/** Screen-Studio style zoom inside the browser viewport. Children are in page coordinates. */
export function Camera({
	keys,
	children,
	drift = 0.015
}: {
	keys: Key[];
	children?: ReactNode;
	drift?: number;
}) {
	const t = useSourceTime();
	const c = cameraAt(keys, t);
	// Slow constant push-in so the frame never sits perfectly still.
	const s = c.s * (1 + drift * (0.5 + 0.5 * Math.sin(t * 0.6)));
	const tx = Math.min(0, Math.max(PAGE.w - PAGE.w * s, PAGE.w / 2 - c.x * s));
	const ty = Math.min(0, Math.max(PAGE.h - PAGE.h * s, PAGE.h / 2 - c.y * s));
	return (
		<div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
			<div
				style={{
					position: 'absolute',
					width: PAGE.w,
					height: PAGE.h,
					transformOrigin: '0 0',
					transform: `translate(${tx}px, ${ty}px) scale(${s})`
				}}
			>
				{children}
			</div>
		</div>
	);
}
