// Client-side accessibility preferences. The server renders the same classes from
// the `a11y` cookie, so there is no flash on load and everything works without JS.
import { getContext, setContext } from 'svelte';
import type { A11yPrefs } from '../app.d';
import { htmlClass } from './a11y';

const KEY = Symbol('a11y');

export class A11yState {
	prefs = $state<A11yPrefs>({ scale: 100, contrast: false, dark: false, easy: false });

	constructor(initial: A11yPrefs) {
		this.prefs = { ...initial };
	}

	update(patch: Partial<A11yPrefs>) {
		this.prefs = { ...this.prefs, ...patch };
		document.cookie = `a11y=${encodeURIComponent(JSON.stringify(this.prefs))}; path=/; max-age=31536000; samesite=lax`;
		const root = document.documentElement;
		root.classList.remove('text-scale-125', 'text-scale-150', 'high-contrast', 'dark');
		for (const c of htmlClass(this.prefs).split(' ').filter(Boolean)) root.classList.add(c);
	}
}

export function setA11y(initial: () => A11yPrefs) {
	return setContext(KEY, new A11yState(initial()));
}

export function getA11y(): A11yState {
	return getContext(KEY);
}
