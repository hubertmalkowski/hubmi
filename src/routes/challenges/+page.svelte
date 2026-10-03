<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import EasyRead from '$lib/components/EasyRead.svelte';
	import { areaLabel, AREA_SLUGS } from '$lib/labels';
	import { POWIAT_TILES } from '$lib/powiats';
	import XIcon from '@lucide/svelte/icons/x';
	import SearchIcon from '@lucide/svelte/icons/search';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import SearchableSelect from '$lib/components/SearchableSelect.svelte';

	let { data } = $props();
	const powiat = $derived(POWIAT_TILES.find((p) => p.teryt === data.powiat));
	const filtered = $derived(Boolean(data.q || data.powiat || data.area));
	const areas = AREA_SLUGS.filter((a) => a !== 'other');
	const powiatOptions = [...POWIAT_TILES]
		.sort((a, b) => a.name.localeCompare(b.name, 'pl'))
		.map((p) => ({ value: p.teryt, label: p.city ? `${p.name} (m.)` : p.name }));
	let form = $state<HTMLFormElement | null>(null);
	const select = 'h-11 w-full rounded-full border border-input bg-background px-4 text-base';
</script>

<svelte:head><title>{m.nav_challenges()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">
	{powiat ? m.challenges_in_powiat({ powiat: powiat.name }) : m.challenges_title()}
</h1>
<EasyRead key="challenges.lead"
	><p class="mt-2 max-w-3xl text-lg text-muted-foreground">{m.challenges_lead()}</p></EasyRead
>

<form
	bind:this={form}
	method="GET"
	class="mt-10 grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] lg:items-end"
	role="search"
	data-sveltekit-keepfocus
	data-sveltekit-noscroll
	data-sveltekit-replacestate
	onchange={(e) => e.currentTarget.requestSubmit()}
>
	<label class="flex flex-col gap-2 text-sm font-medium sm:col-span-2 lg:col-span-1">
		{m.challenges_search()}
		<span class="relative">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<input
				type="search"
				name="q"
				value={data.q}
				placeholder={m.challenges_search_placeholder()}
				class="h-11 w-full rounded-full border border-input bg-background pr-4 pl-9 text-base"
			/>
		</span>
	</label>
	<label class="flex flex-col gap-2 text-sm font-medium">
		{m.challenges_area()}
		<select name="area" value={data.area ?? ''} class={select}>
			<option value="">{m.challenges_all_areas()}</option>
			{#each areas as a (a)}<option value={a}>{areaLabel(a)}</option>{/each}
		</select>
	</label>
	<div class="flex flex-col gap-2 text-sm font-medium">
		<label for="filter-powiat">{m.challenges_powiat()}</label>
		<SearchableSelect
			options={powiatOptions}
			value={data.powiat ?? ''}
			name="powiat"
			id="filter-powiat"
			label={m.challenges_powiat()}
			placeholder={m.challenges_all_powiats()}
			noneLabel={m.challenges_all_powiats()}
			searchPlaceholder={m.powiat_search_placeholder()}
			emptyText={m.powiat_search_empty()}
			icon={MapPinIcon}
			onValueChange={() => form?.requestSubmit()}
			class="h-11 w-full px-4 text-base"
		/>
	</div>
	<label class="flex flex-col gap-2 text-sm font-medium">
		{m.challenges_sort()}
		<select name="sort" value={data.sort} class={select}>
			<option value="reports">{m.challenges_sort_reports()}</option>
			<option value="newest">{m.challenges_sort_newest()}</option>
		</select>
	</label>
	<Button type="submit" class="h-11 rounded-full px-6">{m.challenges_apply()}</Button>
</form>

<div class="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
	<p class="text-sm text-muted-foreground" aria-live="polite">
		{m.challenges_count({ count: String(data.challenges.length) })}
	</p>
	{#if filtered}
		<Button href={localizeHref('/challenges')} variant="outline" size="sm" class="rounded-full">
			<XIcon class="size-4" aria-hidden="true" />{m.challenges_clear_filter()}
		</Button>
	{/if}
</div>

{#if !data.challenges.length}
	<p class="mt-8">{filtered ? m.challenges_empty_filtered() : m.challenges_empty()}</p>
{:else}
	<ul class="mt-6 grid gap-6 md:grid-cols-2">
		{#each data.challenges as c (c.id)}
			<li>
				<Card.Root class="h-full">
					<Card.Header>
						<div class="flex flex-wrap gap-2">
							<Badge>{areaLabel(c.areaSlug)}</Badge>
							<Badge variant="secondary"
								>{m.challenges_reports({ count: String(c.needCount) })}</Badge
							>
							<Badge variant="outline"
								>{m.challenges_gminas({ count: String(c.placeTeryts.length) })}</Badge
							>
						</div>
						<Card.Title
							><h2 class="text-lg leading-snug">
								<a class="hover:underline" href={localizeHref(`/challenges/${c.id}`)}>{c.title}</a>
							</h2></Card.Title
						>
					</Card.Header>
					<Card.Content><p class="text-sm">{c.description}</p></Card.Content>
					<Card.Footer
						><Button href={localizeHref(`/ideas/new?challenge=${c.id}`)} variant="outline"
							>{m.results_challenge_idea()}</Button
						></Card.Footer
					>
				</Card.Root>
			</li>
		{/each}
	</ul>
{/if}
