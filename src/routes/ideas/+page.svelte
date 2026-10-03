<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { needStatusLabel, stageLabel, formatDay } from '$lib/labels';

	let { data } = $props();
</script>

<svelte:head><title>{m.ideas_title()} | {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-4">
	<h1 class="text-3xl font-bold">{data.staff ? m.ideas_title_all() : m.ideas_title()}</h1>
	<Button href={localizeHref('/ideas/new')}>{m.idea_new_title()}</Button>
</div>

<ul class="mt-6 flex flex-col gap-3">
	{#each data.ideas as i (i.id)}
		<li
			class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card-ring bg-card p-4"
		>
			<div>
				<a class="text-lg font-semibold hover:underline" href={localizeHref(`/ideas/${i.id}`)}
					>{i.title}</a
				>
				<p class="text-sm text-muted-foreground">
					{formatDay(i.createdAt, getLocale())} · {stageLabel(i.stage)}
				</p>
			</div>
			<Badge>{needStatusLabel(i.status)}</Badge>
		</li>
	{:else}
		<li class="text-muted-foreground">{m.ideas_empty()}</li>
	{/each}
</ul>
