<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import type { A11yState } from '$lib/a11y-state.svelte';
	import TypeIcon from '@lucide/svelte/icons/type';
	import ContrastIcon from '@lucide/svelte/icons/contrast';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import AccessibilityIcon from '@lucide/svelte/icons/accessibility';
	import SquareIcon from '@lucide/svelte/icons/square';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { onMount } from 'svelte';

	let { a11y }: { a11y: A11yState } = $props();

	const VOICES: Record<string, string> = { pl: 'pl-PL', en: 'en-GB', uk: 'uk-UA' };

	let canSpeak = $state(false);
	let speaking = $state(false);
	onMount(() => {
		canSpeak = 'speechSynthesis' in window;
	});

	function readAloud() {
		if (speaking) {
			speechSynthesis.cancel();
			speaking = false;
			return;
		}
		const main = document.getElementById('main');
		if (!main) return;
		const u = new SpeechSynthesisUtterance(main.innerText);
		u.lang = VOICES[getLocale()] ?? 'pl-PL';
		u.rate = 0.95;
		u.onend = () => (speaking = false);
		speaking = true;
		speechSynthesis.speak(u);
	}

	// Pill toggles; a pressed toggle is filled and shows a check mark.
	const btn =
		'inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground';
</script>

{#snippet toggle(pressed: boolean, label: string, Icon: typeof ContrastIcon, onclick: () => void)}
	<button type="button" class={btn} aria-pressed={pressed} {onclick}>
		<Icon class="size-4 shrink-0" aria-hidden="true" />
		{label}
		{#if pressed}<CheckIcon class="size-4" aria-hidden="true" />{/if}
	</button>
{/snippet}

<section class="no-print" aria-labelledby="a11y-title">
	<h2
		id="a11y-title"
		class="flex items-center gap-2 font-sans text-base font-semibold tracking-normal text-foreground"
	>
		<AccessibilityIcon class="size-5" aria-hidden="true" />
		{m.a11y_toolbar_label()}
	</h2>
	<div class="mt-3 flex flex-wrap items-center gap-2" role="toolbar" aria-labelledby="a11y-title">
		<div class="flex items-center gap-1" role="group" aria-label={m.a11y_text_size()}>
			<TypeIcon class="mx-1 size-4 text-foreground" aria-hidden="true" />
			{#each [100, 125, 150] as const as size (size)}
				<button
					type="button"
					class="{btn} min-w-11 justify-center px-0"
					aria-pressed={a11y.prefs.scale === size}
					onclick={() => a11y.update({ scale: size })}
				>
					<span
						aria-hidden="true"
						style="font-size: {size === 100 ? 0.85 : size === 125 ? 1 : 1.15}rem">A</span
					>
					<span class="sr-only">{m.a11y_text_size_value({ size: String(size) })}</span>
				</button>
			{/each}
		</div>
		{@render toggle(a11y.prefs.contrast, m.a11y_contrast(), ContrastIcon, () =>
			a11y.update({ contrast: !a11y.prefs.contrast })
		)}
		{@render toggle(a11y.prefs.dark, m.a11y_dark(), MoonIcon, () =>
			a11y.update({ dark: !a11y.prefs.dark })
		)}
		{@render toggle(a11y.prefs.easy, m.a11y_easy_read(), BookOpenIcon, () =>
			a11y.update({ easy: !a11y.prefs.easy })
		)}
		{#if canSpeak}
			{@render toggle(
				speaking,
				speaking ? m.a11y_stop_reading() : m.a11y_read_aloud(),
				speaking ? SquareIcon : Volume2Icon,
				readAloud
			)}
		{/if}
	</div>
</section>
