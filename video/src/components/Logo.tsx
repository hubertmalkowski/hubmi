import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C, SERIF, SANS } from '../theme';

// lucide "wheat", the icon the app uses in its header.
const WHEAT = [
	'M2 22 16 8',
	'M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
	'M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
	'M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
	'M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z',
	'M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
	'M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
	'M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z'
];

/** Animated "Zaczyn" wordmark. `start` is the frame the build begins. */
export function Logo({
	start = 0,
	size = 1,
	tagline
}: {
	start?: number;
	size?: number;
	tagline?: string;
}) {
	const frame = useCurrentFrame() - start;
	const { fps } = useVideoConfig();
	const badge = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
	const draw = interpolate(frame, [4, 26], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});
	const letters = 'Zaczyn'.split('');
	const line = spring({ frame: frame - 20, fps, config: { damping: 20 } });
	const tag = spring({ frame: frame - 26, fps, config: { damping: 18 } });
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				transform: `scale(${size})`
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
				<div
					style={{
						width: 150,
						height: 150,
						borderRadius: 38,
						background: C.white,
						display: 'grid',
						placeItems: 'center',
						transform: `scale(${badge}) rotate(${(1 - badge) * -25}deg)`,
						boxShadow: '0 24px 60px rgba(2,8,23,.45)'
					}}
				>
					<svg
						width="92"
						height="92"
						viewBox="0 0 24 24"
						fill="none"
						stroke={C.navy}
						strokeWidth="1.9"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						{WHEAT.map((d, i) => (
							<path
								key={i}
								d={d}
								pathLength={1}
								strokeDasharray={1}
								strokeDashoffset={
									1 -
									interpolate(draw, [i * 0.08, i * 0.08 + 0.45], [0, 1], {
										extrapolateLeft: 'clamp',
										extrapolateRight: 'clamp'
									})
								}
							/>
						))}
					</svg>
				</div>
				<div
					style={{
						position: 'relative',
						fontFamily: SERIF,
						fontWeight: 650,
						fontSize: 168,
						color: C.white,
						letterSpacing: '-0.02em',
						lineHeight: 1
					}}
				>
					{letters.map((l, i) => {
						const s = spring({
							frame: frame - 6 - i * 2.5,
							fps,
							config: { damping: 14, mass: 0.6 }
						});
						return (
							<span
								key={i}
								style={{
									display: 'inline-block',
									transform: `translateY(${(1 - s) * 60}px)`,
									opacity: s,
									filter: `blur(${(1 - s) * 14}px)`
								}}
							>
								{l}
							</span>
						);
					})}
					<div
						style={{
							position: 'absolute',
							left: 4,
							right: 4,
							bottom: -18,
							height: 10,
							borderRadius: 5,
							background: C.yellow,
							transformOrigin: 'left',
							transform: `scaleX(${line})`
						}}
					/>
				</div>
			</div>
			{tagline && (
				<div style={{ overflow: 'hidden', marginTop: 54 }}>
					<div
						style={{
							fontFamily: SANS,
							fontWeight: 500,
							fontSize: 42,
							color: 'rgba(255,255,255,.88)',
							transform: `translateY(${(1 - tag) * 100}%)`,
							opacity: tag
						}}
					>
						{tagline}
					</div>
				</div>
			)}
		</div>
	);
}
