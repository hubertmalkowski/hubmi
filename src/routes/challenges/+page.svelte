<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import EasyRead from '$lib/components/EasyRead.svelte';
	import { areaLabel } from '$lib/labels';

	let { data } = $props();
</script>

<svelte:head><title>{m.nav_challenges()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.challenges_title()}</h1>
<EasyRead key="challenges.lead"
	><p class="mt-2 max-w-3xl text-lg text-muted-foreground">{m.challenges_lead()}</p></EasyRead
>

{#if !data.challenges.length}
	<p class="mt-8">{m.challenges_empty()}</p>
{:else}
	<ul class="mt-6 grid gap-4 md:grid-cols-2">
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
