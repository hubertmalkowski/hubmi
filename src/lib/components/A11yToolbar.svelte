<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import type { A11yState } from '$lib/a11y-state.svelte';
	import TypeIcon from '@lucide/svelte/icons/type';
	import ContrastIcon from '@lucide/svelte/icons/contrast';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import SquareIcon from '@lucide/svelte/icons/square';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import { onMount } from 'svelte';

	let { a11y }: { a11y: A11yState } = $props();

	const LANG_NAMES: Record<string, string> = { pl: 'Polski', en: 'English', uk: 'Українська' };
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

	const btn =
		'inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-3 aria-pressed:bg-primary aria-pressed:text-primary-foreground';
</script>

<div class="no-print border-b border-border bg-muted">
	<div
		class="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-1 sm:px-6"
		role="toolbar"
		aria-label={m.a11y_toolbar_label()}
	>
		<span class="mr-1 hidden text-sm text-muted-foreground sm:inline"
			>{m.a11y_toolbar_label()}:</span
		>

		<div class="flex items-center" role="group" aria-label={m.a11y_text_size()}>
			<TypeIcon class="mx-1 size-4 text-muted-foreground" aria-hidden="true" />
			{#each [100, 125, 150] as const as size (size)}
				<button
					type="button"
					class={btn}
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

		<button
			type="button"
			class={btn}
			aria-pressed={a11y.prefs.contrast}
			onclick={() => a11y.update({ contrast: !a11y.prefs.contrast })}
		>
			<ContrastIcon class="size-4" aria-hidden="true" />
			{m.a11y_contrast()}
		</button>
		<button
			type="button"
			class={btn}
			aria-pressed={a11y.prefs.dark}
			onclick={() => a11y.update({ dark: !a11y.prefs.dark })}
		>
			<MoonIcon class="size-4" aria-hidden="true" />
			{m.a11y_dark()}
		</button>
		<button
			type="button"
			class={btn}
			aria-pressed={a11y.prefs.easy}
			onclick={() => a11y.update({ easy: !a11y.prefs.easy })}
		>
			<BookOpenIcon class="size-4" aria-hidden="true" />
			{m.a11y_easy_read()}
		</button>
		{#if canSpeak}
			<button type="button" class={btn} aria-pressed={speaking} onclick={readAloud}>
				{#if speaking}<SquareIcon
						class="size-4"
						aria-hidden="true"
					/>{m.a11y_stop_reading()}{:else}<Volume2Icon
						class="size-4"
						aria-hidden="true"
					/>{m.a11y_read_aloud()}{/if}
			</button>
		{/if}

		<nav class="ml-auto flex flex-wrap items-center gap-1" aria-label={m.a11y_language()}>
			<LanguagesIcon class="size-4 text-muted-foreground" aria-hidden="true" />
			{#each locales as locale (locale)}
				<a
					href={localizeHref(page.url.pathname, { locale })}
					hreflang={locale}
					lang={locale}
					data-sveltekit-reload
					aria-current={getLocale() === locale ? 'true' : undefined}
					class="inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium hover:bg-accent aria-[current=true]:bg-primary aria-[current=true]:text-primary-foreground"
				>
					{LANG_NAMES[locale]}
				</a>
			{/each}
		</nav>
	</div>
</div>
