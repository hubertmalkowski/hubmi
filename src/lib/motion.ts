// Svelte attachments wrapping motion.dev. All animations are skipped under prefers-reduced-motion;
// [data-reveal] elements start hidden via CSS only when JS runs (see layout.css).
import { animate, inView } from 'motion';
import type { Attachment } from 'svelte/attachments';

const EASE = [0.22, 1, 0.36, 1] as const;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fade and rise into place on first scroll into view. Pair with a `data-reveal` attribute in markup. */
export function reveal({ delay = 0, y = 16 } = {}): Attachment<HTMLElement> {
	return (el) => {
		if (reduced()) return;
		return inView(
			el,
			() => {
				animate(el, { opacity: [0, 1], y: [y, 0] }, { duration: 0.6, delay, ease: EASE });
			},
			{ amount: 0.2 }
		);
	};
}

/** Small pop-in when the element is mounted, e.g. a badge that appears after classification. */
export function pop(delay = 0): Attachment<HTMLElement> {
	return (el) => {
		if (reduced()) return;
		animate(el, { opacity: [0, 1], scale: [0.85, 1] }, { duration: 0.35, delay, ease: EASE });
	};
}
