import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../theme';

/** Navy gradient with slow drifting light blobs and film grain. */
export function Background() {
	const f = useCurrentFrame();
	const blob = (x: number, y: number, r: number, color: string, o: number) => (
		<div
			style={{
				position: 'absolute',
				left: x - r,
				top: y - r,
				width: r * 2,
				height: r * 2,
				borderRadius: '50%',
				background: color,
				opacity: o,
				filter: 'blur(120px)'
			}}
		/>
	);
	return (
		<AbsoluteFill
			style={{
				background: `radial-gradient(120% 90% at 30% 20%, ${C.navyMid} 0%, ${C.navy} 45%, ${C.navyDeep} 100%)`
			}}
		>
			{blob(400 + 160 * Math.sin(f / 70), 260 + 80 * Math.cos(f / 90), 380, '#3b7be8', 0.45)}
			{blob(1500 + 140 * Math.cos(f / 80), 820 + 90 * Math.sin(f / 60), 420, '#2a5bc4', 0.4)}
			{blob(1650 + 60 * Math.sin(f / 50), 180, 180, C.yellow, 0.12)}
			<svg
				width="100%"
				height="100%"
				style={{ position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay' }}
			>
				<filter id="grain">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 8} />
				</filter>
				<rect width="100%" height="100%" filter="url(#grain)" />
			</svg>
		</AbsoluteFill>
	);
}
