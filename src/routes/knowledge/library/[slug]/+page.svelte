<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import EasyRead from '$lib/components/EasyRead.svelte';
	import { areaLabel, groupLabel, stageLabel } from '$lib/labels';

	let { data } = $props();
	const i = $derived(data.innovation);
</script>

<svelte:head>
	<title>{i.title} | {m.app_name()}</title>
	<meta name="description" content={i.summary} />
</svelte:head>

<nav aria-label={m.breadcrumb()} class="text-sm text-muted-foreground">
	<a class="underline underline-offset-4" href={localizeHref('/knowledge/library')}
		>{m.library_title()}</a
	>
	/ <span aria-current="page">{i.title}</span>
</nav>

<article class="mt-4 grid gap-8 lg:grid-cols-[1fr_20rem]">
	<div>
		<div class="flex flex-wrap gap-2">
			<Badge>{areaLabel(i.areaSlug)}</Badge>
			<Badge variant="outline">{stageLabel(i.stage)}</Badge>
			{#each i.targetGroups as g (g)}<Badge variant="secondary">{groupLabel(g)}</Badge>{/each}
		</div>
		<h1 class="mt-3 text-3xl font-bold">{i.title}</h1>
		{#if data.translating}<p class="mt-2 text-sm text-muted-foreground">
				{m.translation_pending()}
			</p>{/if}
		<EasyRead key="innovation:{i.slug}">
			<p class="mt-4 text-xl">{i.summary}</p>
			<p class="mt-4 text-lg leading-relaxed">{i.description}</p>
		</EasyRead>

		{#if i.videoUrl}
			<div class="mt-6 aspect-video overflow-hidden rounded-xl">
				<iframe
					src={i.videoUrl}
					title={m.innovation_video({ title: i.title })}
					class="size-full"
					allowfullscreen
					loading="lazy"
				></iframe>
			</div>
		{/if}

		<section class="mt-8" aria-labelledby="impl">
			<h2 id="impl" class="text-xl font-semibold">{m.innovation_implementation()}</h2>
			<p class="mt-2">{i.implementationNotes || m.innovation_no_data()}</p>
			<h3 class="mt-4 font-semibold">{m.innovation_cost()}</h3>
			<p>{i.costHint || m.innovation_no_data()}</p>
		</section>
	</div>

	<aside class="flex flex-col gap-4">
		<Card.Root>
			<Card.Header
				><Card.Title><h2 class="text-lg">{m.innovation_adapt_title()}</h2></Card.Title></Card.Header
			>
			<Card.Content><p class="text-sm">{m.innovation_adapt_text()}</p></Card.Content>
			<Card.Footer
				><Button href={localizeHref(`/adapt/${i.slug}`)} class="w-full">{m.match_adapt()}</Button
				></Card.Footer
			>
		</Card.Root>
		{#if data.campaigns.length}
			<Card.Root>
				<Card.Header
					><Card.Title><h2 class="text-lg">{m.innovation_tests_title()}</h2></Card.Title
					></Card.Header
				>
				<Card.Content>
					<ul class="flex flex-col gap-2">
						{#each data.campaigns as c (c.id)}<li>
								<a
									class="text-primary underline underline-offset-4"
									href={localizeHref(`/tests/${c.id}`)}>{c.title}</a
								>
							</li>{/each}
					</ul>
				</Card.Content>
			</Card.Root>
		{/if}
		{#if data.related.length}
			<section aria-labelledby="related">
				<h2 id="related" class="text-lg font-semibold">{m.innovation_related()}</h2>
				<ul class="mt-2 flex flex-col gap-3">
					{#each data.related as r (r.slug)}
						<li>
							<a
								class="font-medium underline underline-offset-4"
								href={localizeHref(`/knowledge/library/${r.slug}`)}>{r.title}</a
							>
							<p class="text-sm text-muted-foreground">{r.summary}</p>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</aside>
</article>
