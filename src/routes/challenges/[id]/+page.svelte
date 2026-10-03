<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { areaLabel, needStatusLabel, formatDay } from '$lib/labels';

	let { data } = $props();
	const c = $derived(data.challenge);
</script>

<svelte:head><title>{c.title} | {m.app_name()}</title></svelte:head>

<nav aria-label={m.breadcrumb()} class="text-sm text-muted-foreground">
	<a class="underline underline-offset-4" href={localizeHref('/challenges')}>{m.nav_challenges()}</a
	>
	/ <span aria-current="page">{c.title}</span>
</nav>

<div class="mt-4 grid gap-8 lg:grid-cols-[1fr_18rem]">
	<div>
		<Badge>{areaLabel(c.areaSlug)}</Badge>
		<h1 class="mt-3 text-3xl font-bold">{c.title}</h1>
		<p class="mt-4 text-lg">{c.description}</p>
		<Button href={localizeHref(`/ideas/new?challenge=${c.id}`)} size="lg" class="mt-6"
			>{m.results_challenge_idea()}</Button
		>

		<section class="mt-10" aria-labelledby="reports">
			<h2 id="reports" class="text-xl font-semibold">
				{m.challenge_reports_title({ count: String(c.needCount) })}
			</h2>
			<ul class="mt-3 flex flex-col gap-3">
				{#each data.reports as r (r.id)}
					<li class="rounded-lg border border-card-ring bg-card p-4">
						<p>{r.text}</p>
						<p class="mt-1 text-sm text-muted-foreground">{formatDay(r.createdAt, getLocale())}</p>
					</li>
				{/each}
			</ul>
		</section>
	</div>
	<aside class="flex flex-col gap-6">
		<section aria-labelledby="where">
			<h2 id="where" class="font-semibold">{m.challenge_where()}</h2>
			<ul class="mt-2 text-sm">
				{#each data.gminas as g (g.name)}<li>{g.name} ({g.powiat})</li>{:else}<li
						class="text-muted-foreground"
					>
						{m.innovation_no_data()}
					</li>{/each}
			</ul>
		</section>
		<section aria-labelledby="answers">
			<h2 id="answers" class="font-semibold">{m.challenge_ideas_title()}</h2>
			<ul class="mt-2 flex flex-col gap-2 text-sm">
				{#each data.ideas as i (i.id)}
					<li>
						<a class="underline underline-offset-4" href={localizeHref(`/ideas/${i.id}`)}
							>{i.title}</a
						> <span class="text-muted-foreground">({needStatusLabel(i.status)})</span>
					</li>
				{:else}
					<li class="text-muted-foreground">{m.challenge_no_ideas()}</li>
				{/each}
			</ul>
		</section>
	</aside>
</div>
