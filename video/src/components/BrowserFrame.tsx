import type { CSSProperties, ReactNode } from 'react';
import { C, PAGE, SANS } from '../theme';

export const BAR = 46;

/** Minimal browser window around a 1600x900 viewport. Scale it with `style.transform`. */
export function BrowserFrame({
	path,
	children,
	style,
	dark = false
}: {
	path: string;
	children: ReactNode;
	style?: CSSProperties;
	dark?: boolean;
}) {
	return (
		<div
			style={{
				position: 'absolute',
				width: PAGE.w,
				height: PAGE.h + BAR,
				borderRadius: 22,
				overflow: 'hidden',
				background: dark ? '#1c1f26' : '#f3f5f8',
				boxShadow:
					'0 50px 120px rgba(2,8,23,.55), 0 12px 32px rgba(2,8,23,.35), 0 0 0 1px rgba(255,255,255,.08)',
				...style
			}}
		>
			<div
				style={{ height: BAR, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 9 }}
			>
				{['#ff5f57', '#febc2e', '#28c840'].map((c) => (
					<div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />
				))}
				<div
					style={{
						margin: '0 auto',
						width: 520,
						height: 28,
						borderRadius: 14,
						background: dark ? '#2a2e37' : '#ffffff',
						boxShadow: dark ? 'none' : '0 0 0 1px rgba(15,23,42,.08)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 8,
						fontFamily: SANS,
						fontSize: 15,
						color: dark ? '#c9ced8' : '#4b5563'
					}}
				>
					<svg width="12" height="14" viewBox="0 0 12 14">
						<rect x="1" y="6" width="10" height="7" rx="2" fill={dark ? '#c9ced8' : '#6b7280'} />
						<path
							d="M3 6V4.5a3 3 0 0 1 6 0V6"
							stroke={dark ? '#c9ced8' : '#6b7280'}
							strokeWidth="1.6"
							fill="none"
						/>
					</svg>
					<span style={{ fontWeight: 600, color: dark ? '#fff' : C.ink }}>zaczyn</span>
					<span>{path}</span>
				</div>
				<div style={{ width: 80 }} />
			</div>
			<div
				style={{
					position: 'relative',
					width: PAGE.w,
					height: PAGE.h,
					background: '#fff',
					overflow: 'hidden'
				}}
			>
				{children}
			</div>
		</div>
	);
}
