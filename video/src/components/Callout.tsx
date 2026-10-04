import { C, PAGE, clamp01, easeInOut } from '../theme';
import { useSourceTime } from './source-time';

type Box = { x: number; y: number; w: number; h: number };

/** Dims the page around `box` and draws a glowing yellow outline, between source times t0 and t1. */
export function Callout({
	box,
	t0,
	t1,
	pad = 10,
	radius = 16,
	dim = 0.38
}: {
	box: Box;
	t0: number;
	t1: number;
	pad?: number;
	radius?: number;
	dim?: number;
}) {
	const t = useSourceTime();
	const fadeIn = easeInOut(clamp01((t - t0) / 0.6));
	const fadeOut = 1 - easeInOut(clamp01((t - (t1 - 0.5)) / 0.5));
	const o = Math.min(fadeIn, fadeOut);
	if (o <= 0) return null;
	const draw = easeInOut(clamp01((t - t0) / 1.0));
	const x = box.x - pad,
		y = box.y - pad,
		w = box.w + pad * 2,
		h = box.h + pad * 2;
	return (
		<svg
			width={PAGE.w}
			height={PAGE.h}
			style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
		>
			<defs>
				<mask id={`hole-${t0}`}>
					<rect width={PAGE.w} height={PAGE.h} fill="white" />
					<rect x={x} y={y} width={w} height={h} rx={radius} fill="black" />
				</mask>
				<filter id={`glow-${t0}`} x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="6" result="b" />
					<feMerge>
						<feMergeNode in="b" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
			<rect
				width={PAGE.w}
				height={PAGE.h}
				fill={C.navyDeep}
				opacity={dim * o}
				mask={`url(#hole-${t0})`}
			/>
			<rect
				x={x}
				y={y}
				width={w}
				height={h}
				rx={radius}
				fill="none"
				stroke={C.yellow}
				strokeWidth={4}
				pathLength={1}
				strokeDasharray={1}
				strokeDashoffset={1 - draw}
				opacity={o}
				filter={`url(#glow-${t0})`}
			/>
		</svg>
	);
}

/** Expanding rings on a point, e.g. a county on the map. */
export function Pulse({ x, y, t0, t1 }: { x: number; y: number; t0: number; t1: number }) {
	const t = useSourceTime();
	if (t < t0 || t > t1) return null;
	const fade = clamp01((t1 - t) / 0.3);
	return (
		<svg
			width={PAGE.w}
			height={PAGE.h}
			style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
		>
			{[0, 0.33, 0.66].map((off) => {
				const k = ((t - t0) / 1.1 + off) % 1;
				return (
					<circle
						key={off}
						cx={x}
						cy={y}
						r={18 + k * 90}
						fill="none"
						stroke={C.yellow}
						strokeWidth={5 * (1 - k) + 1}
						opacity={(1 - k) * fade}
					/>
				);
			})}
		</svg>
	);
}
