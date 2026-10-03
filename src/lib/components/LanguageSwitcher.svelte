<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';

	const LANG_NAMES: Record<string, string> = { pl: 'Polski', en: 'English', uk: 'Українська' };
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-accent"
		aria-label="{m.a11y_language()}: {LANG_NAMES[getLocale()]}"
	>
		<LanguagesIcon class="size-4" aria-hidden="true" />
		<span lang={getLocale()} class="hidden sm:inline">{LANG_NAMES[getLocale()]}</span>
		<span lang={getLocale()} class="uppercase sm:hidden">{getLocale()}</span>
		<ChevronDownIcon class="size-4" aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="min-w-44">
		{#each locales as locale (locale)}
			<DropdownMenu.Item class="min-h-11 text-base">
				{#snippet child({ props })}
					<a
						{...props}
						href={localizeHref(page.url.pathname, { locale })}
						hreflang={locale}
						lang={locale}
						data-sveltekit-reload
						aria-current={getLocale() === locale ? 'true' : undefined}
					>
						<span class="flex-1">{LANG_NAMES[locale]}</span>
						{#if getLocale() === locale}<CheckIcon class="size-4" aria-hidden="true" />{/if}
					</a>
				{/snippet}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
