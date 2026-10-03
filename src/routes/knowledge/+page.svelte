<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import ChallengeMap from '$lib/components/ChallengeMap.svelte';
	import EasyRead from '$lib/components/EasyRead.svelte';
	import { areaLabel, AREA_SLUGS } from '$lib/labels';

	let { data } = $props();
	const areas = AREA_SLUGS.filter((a) => a !== 'other');
</script>

<svelte:head><title>{m.knowledge_title()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.knowledge_title()}</h1>
<EasyRead key="knowledge.lead"
	><p class="mt-2 max-w-3xl text-lg text-muted-foreground">{m.knowledge_lead()}</p></EasyRead
>

<nav class="mt-6 flex flex-wrap gap-2" aria-label={m.knowledge_sections()}>
	<Button href={localizeHref('/knowledge/library')}>{m.knowledge_library()}</Button>
	<Button href={localizeHref('/knowledge/materials')} variant="outline"
		>{m.knowledge_materials()}</Button
	>
	<Button href={localizeHref('/challenges')} variant="outline">{m.nav_challenges()}</Button>
</nav>

<section class="mt-10" aria-labelledby="map-title">
	<h2 id="map-title" class="text-2xl font-bold">{m.knowledge_map_title()}</h2>
	<form method="GET" class="mt-3 flex flex-wrap items-end gap-2">
		<label class="flex flex-col gap-1 text-sm font-medium">
			{m.knowledge_filter_area()}
			<select
				name="area"
				class="min-h-11 rounded-md border border-input bg-background px-3 text-base"
				value={data.area ?? ''}
			>
				<option value="">{m.knowledge_all_areas()}</option>
				{#each areas as a (a)}<option value={a}>{areaLabel(a)}</option>{/each}
			</select>
		</label>
		<Button type="submit" variant="secondary">{m.knowledge_apply()}</Button>
	</form>
	<div class="mt-4">
		<ChallengeMap
			counts={data.byPowiat}
			href={(t) => localizeHref(`/challenges?powiat=${t}${data.area ? `&area=${data.area}` : ''}`)}
			title={data.area
				? m.knowledge_map_area({ area: areaLabel(data.area) })
				: m.knowledge_map_all()}
		/>
	</div>
	<p class="mt-2 text-sm text-muted-foreground">{m.knowledge_map_source()}</p>
</section>

<section class="mt-10" aria-labelledby="areas-title">
	<h2 id="areas-title" class="text-2xl font-bold">{m.knowledge_areas_title()}</h2>
	<ul class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each areas as a (a)}
			<li>
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title><h3 class="text-lg">{areaLabel(a)}</h3></Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid grid-cols-2 gap-2 text-sm">
							<div>
								<dt class="text-muted-foreground">{m.knowledge_area_needs()}</dt>
								<dd class="text-2xl font-bold">{data.areaNeeds[a] ?? 0}</dd>
							</div>
							<div>
								<dt class="text-muted-foreground">{m.knowledge_area_innovations()}</dt>
								<dd class="text-2xl font-bold">{data.areaInnovations[a] ?? 0}</dd>
							</div>
						</dl>
					</Card.Content>
					<Card.Footer
						><a
							class="text-primary underline underline-offset-4"
							href={localizeHref(`/knowledge/library?area=${a}`)}
							>{m.knowledge_area_link({ area: areaLabel(a) })}</a
						></Card.Footer
					>
				</Card.Root>
			</li>
		{/each}
	</ul>
</section>
