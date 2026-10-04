import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, SANS, SERIF } from '../theme';

/**
 * Kinetic caption bar under the browser window: kicker label, then the headline word by word.
 * Words wrapped in *asterisks* turn yellow and get an underline sweep.
 */
export function Caption({
	kicker,
	text,
	from,
	to,
	y = 985
}: {
	kicker: string;
	text: string;
	from: number;
	to: number;
	y?: number;
}) {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	if (frame < from - 1 || frame > to + 12) return null;
	const local = frame - from;
	const exit = interpolate(frame, [to, to + 10], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp'
	});
	const card = spring({ frame: local, fps, config: { damping: 18, mass: 0.7 } });
	// Track *marked spans* across words.
	let open = false;
	const words = text.split(' ').map((raw) => {
		const starts = raw.startsWith('*');
		const ends = raw.endsWith('*');
		const marked = open || starts;
		const last = marked && ends;
		if (starts) open = true;
		if (ends) open = false;
		return { w: raw.replaceAll('*', ''), marked, last };
	});
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: y,
				display: 'flex',
				justifyContent: 'center'
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 26,
					whiteSpace: 'nowrap',
					transform: `translateY(calc(-50% + ${(1 - card) * 30 - exit * 16}px)) scale(${0.95 + card * 0.05})`,
					opacity: card * (1 - exit),
					filter: `blur(${exit * 8}px)`
				}}
			>
				<div
					style={{
						fontFamily: SANS,
						fontWeight: 700,
						fontSize: 20,
						letterSpacing: '0.16em',
						textTransform: 'uppercase',
						color: C.navyDeep,
						background: C.yellow,
						padding: '9px 16px 8px',
						borderRadius: 999,
						transform: `scale(${spring({ frame: local - 2, fps, config: { damping: 12 } })})`
					}}
				>
					{kicker}
				</div>
				<div
					style={{
						fontFamily: SERIF,
						fontWeight: 600,
						fontSize: 50,
						lineHeight: 1,
						color: C.white,
						letterSpacing: '-0.01em'
					}}
				>
					{words.map(({ w, marked, last }, i) => {
						const s = spring({
							frame: local - 5 - i * 2.2,
							fps,
							config: { damping: 16, mass: 0.6 }
						});
						const sweep = spring({ frame: local - 12 - i * 2.2, fps, config: { damping: 22 } });
						return (
							<span
								key={i}
								style={{
									display: 'inline-block',
									position: 'relative',
									marginRight: i < words.length - 1 ? '0.24em' : 0
								}}
							>
								<span
									style={{
										display: 'inline-block',
										transform: `translateY(${(1 - s) * 26}px)`,
										opacity: s,
										filter: `blur(${(1 - s) * 6}px)`,
										color: marked ? C.yellow : undefined
									}}
								>
									{w}
								</span>
								{marked && (
									<span
										style={{
											position: 'absolute',
											left: 0,
											right: last ? 0 : '-0.24em',
											bottom: -10,
											height: 4,
											borderRadius: 2,
											background: C.yellow,
											transformOrigin: 'left',
											transform: `scaleX(${sweep})`
										}}
									/>
								)}
							</span>
						);
					})}
				</div>
			</div>
		</div>
	);
}
