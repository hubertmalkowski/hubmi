<script lang="ts">
	// Wraps a text section. With the "easy read" preference on, the section is rewritten
	// by Claude into tekst łatwy do czytania (cached server-side) and shown in its place.
	import type { Snippet } from 'svelte';
	import { getA11y } from '$lib/a11y-state.svelte';
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { key, children }: { key: string; children: Snippet } = $props();
	const a11y = getA11y();
	let el: HTMLDivElement | undefined = $state();
	let simple = $state<string | null>(null);
	let loading = $state(false);
	let failed = $state(false);

	$effect(() => {
		if (!a11y.prefs.easy || simple || loading || !el) return;
		const text = el.innerText.trim();
		if (!text) return;
		loading = true;
		fetch('/api/simplify', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ key: `${key}:${getLocale()}`, text, locale: getLocale() })
		})
			.then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
			.then((d: { text: string }) => (simple = d.text))
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});
</script>

<div bind:this={el} hidden={a11y.prefs.easy && !!simple}>
	{@render children()}
</div>
{#if a11y.prefs.easy}
	<div aria-live="polite">
		{#if loading}
			<Skeleton class="h-16 w-full" />
			<span class="sr-only">{m.a11y_easy_loading()}</span>
		{:else if simple}
			<div
				class="mt-2 rounded-lg border-l-4 border-primary bg-secondary p-4 text-lg leading-relaxed whitespace-pre-line"
			>
				<p class="mb-1 text-sm font-semibold text-muted-foreground">{m.a11y_easy_badge()}</p>
				{simple}
			</div>
		{:else if failed}
			<p class="text-sm text-muted-foreground">{m.a11y_easy_failed()}</p>
		{/if}
	</div>
{/if}
