// Brand tokens taken from the app (src/routes/layout.css).
export const FPS = 30;
export const C = {
	navy: '#112d62', // --primary oklch(0.33 0.1 258)
	navyDeep: '#08152f',
	navyMid: '#173b7d',
	hero: '#eaf1fb', // --hero
	yellow: '#ffdd00', // gov.uk focus ring
	ink: '#0b0c0c',
	white: '#ffffff'
};
export const SANS = "'Inter Variable', Inter, sans-serif";
export const SERIF = "'Source Serif 4 Variable', 'Source Serif 4', serif";

// The recorded page is 1600x900 CSS px (captured at 2x).
export const PAGE = { w: 1600, h: 900 };

export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const clamp01 = (k: number) => Math.min(1, Math.max(0, k));
