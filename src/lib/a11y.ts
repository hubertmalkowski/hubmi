import type { A11yPrefs } from '../app.d';

export const DEFAULT_A11Y: A11yPrefs = { scale: 100, contrast: false, dark: false, easy: false };

export function parseA11y(raw: string | undefined): A11yPrefs {
	if (!raw) return DEFAULT_A11Y;
	try {
		const v = JSON.parse(raw) as Partial<A11yPrefs>;
		return {
			scale: v.scale === 125 || v.scale === 150 ? v.scale : 100,
			contrast: !!v.contrast,
			dark: !!v.dark,
			easy: !!v.easy
		};
	} catch {
		return DEFAULT_A11Y;
	}
}

export function htmlClass(p: A11yPrefs): string {
	return [p.scale !== 100 ? `text-scale-${p.scale}` : '', p.contrast ? 'high-contrast' : '', p.dark ? 'dark' : '']
		.filter(Boolean)
		.join(' ');
}
