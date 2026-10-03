// Live classification of a need description while the user types (debounced POST /api/classify).
import { NEED_MIN } from '$lib/schemas/need';

export type Classified = {
	area: { slug: string; p: number; confidence: number };
	target_groups: { slug: string; p: number }[];
	urgent: boolean;
	is_need: number;
	pii: number;
	/** will be held for moderation as offensive or threatening */
	abusive: boolean;
	place: { teryt: string; name: string; powiat: string } | null;
	/** likely related innovations from retrieval only, before reranking */
	preview: { slug: string; title: string }[];
};

/** Call during component init; reclassifies whenever `getText()` changes. */
export function createClassifier(getText: () => string, delay = 600) {
	let result = $state<Classified | null>(null);
	let pending = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	async function classify(text: string) {
		controller?.abort();
		controller = new AbortController();
		pending = true;
		try {
			const res = await fetch('/api/classify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text }),
				signal: controller.signal
			});
			if (res.ok) result = await res.json();
		} catch {
			/* aborted or offline: the form still works without classification */
		} finally {
			pending = false;
		}
	}

	// Covers typing, dictation, examples, and text entered before hydration.
	$effect(() => {
		const text = getText();
		clearTimeout(timer);
		if (text.trim().length < NEED_MIN) {
			result = null;
			return;
		}
		timer = setTimeout(() => classify(text), delay);
		return () => clearTimeout(timer);
	});

	return {
		get result() {
			return result;
		},
		get pending() {
			return pending;
		}
	};
}
