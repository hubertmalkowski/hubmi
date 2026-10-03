<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import Highlighted from '$lib/components/Highlighted.svelte';
	import { areaLabel, groupLabel, stageLabel, AREA_SLUGS, GROUP_SLUGS } from '$lib/labels';
	import SearchIcon from '@lucide/svelte/icons/search';

	let { data } = $props();
	const pages = $derived(Math.ceil(data.total / data.pageSize));
	const selectCls =
		'border-input bg-background min-h-11 w-full min-w-0 rounded-md border px-3 text-base';
	const pageHref = (n: number) => {
		const u = new URLSearchParams({ ...data.query, page: String(n) } as Record<string, string>);
		return localizeHref(`/knowledge/library?${u}`);
	};
</script>

<svelte:head><title>{m.library_title()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.library_title()}</h1>
<p class="mt-2 max-w-3xl text-lg text-muted-foreground">{m.library_lead()}</p>

<form
	method="GET"
	role="search"
	class="mt-6 grid gap-3 rounded-xl border border-card-ring bg-card p-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
>
	<label class="flex flex-col gap-1 text-sm font-medium">
		{m.library_search_label()}
		<Input
			name="q"
			type="search"
			value={data.query.q}
			placeholder={m.library_search_placeholder()}
			class="min-h-11 text-base"
		/>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium">
		{m.knowledge_filter_area()}
		<select name="area" class={selectCls} value={data.query.area}>
			<option value="">{m.library_any()}</option>
			{#each AREA_SLUGS as a (a)}<option value={a}>{areaLabel(a)}</option>{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium">
		{m.library_filter_group()}
		<select name="group" class={selectCls} value={data.query.group}>
			<option value="">{m.library_any()}</option>
			{#each GROUP_SLUGS as g (g)}<option value={g}>{groupLabel(g)}</option>{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-medium">
		{m.library_filter_stage()}
		<select name="stage" class={selectCls} value={data.query.stage}>
			<option value="">{m.library_any()}</option>
			{#each ['implemented', 'tested', 'prototype', 'idea'] as s (s)}<option value={s}
					>{stageLabel(s)}</option
				>{/each}
		</select>
	</label>
	<Button type="submit" size="lg"
		><SearchIcon class="size-4" aria-hidden="true" />{m.library_search()}</Button
	>
</form>

<p class="mt-6 font-medium" aria-live="polite" role="status">
	{m.library_results({ count: String(data.total) })}
</p>

<ul class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.items as it (it.id)}
		<li>
			<Card.Root class="h-full">
				<Card.Header>
					<div class="flex flex-wrap gap-2">
						<Badge>{areaLabel(it.areaSlug)}</Badge>
						<Badge variant="outline">{stageLabel(it.stage)}</Badge>
					</div>
					<Card.Title>
						<h2 class="text-lg leading-snug">
							<a href={localizeHref(`/knowledge/library/${it.slug}`)} class="hover:underline">
								{#if it.highlights?.title?.[0]}<Highlighted
										fragment={it.highlights.title[0]}
									/>{:else}{it.title}{/if}
							</a>
						</h2>
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-sm">
						{#if it.highlights?.summary?.[0]}<Highlighted
								fragment={it.highlights.summary[0]}
							/>{:else}{it.summary}{/if}
					</p>
					{#if it.targetGroups.length}
						<p class="mt-3 text-xs text-muted-foreground">
							{it.targetGroups.map(groupLabel).join(' · ')}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</li>
	{/each}
</ul>

{#if !data.query.q && pages > 1}
	<nav class="mt-8 flex flex-wrap gap-2" aria-label={m.library_pagination()}>
		{#each Array.from({ length: pages }, (_, i) => i + 1) as n (n)}
			<Button
				href={pageHref(n)}
				variant={n === data.query.page ? 'default' : 'outline'}
				aria-current={n === data.query.page ? 'page' : undefined}>{n}</Button
			>
		{/each}
	</nav>
{/if}
