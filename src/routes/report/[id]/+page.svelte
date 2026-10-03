<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import { Progress } from '$lib/components/ui/progress';
	import MatchCard from '$lib/components/MatchCard.svelte';
	import StatusTimeline from '$lib/components/StatusTimeline.svelte';
	import { areaLabel, groupLabel, formatDay } from '$lib/labels';
	import { POWIAT_NAME } from '$lib/powiats';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ShieldIcon from '@lucide/svelte/icons/shield-check';

	let { data } = $props();

	const STEPS = ['redact', 'classify', 'search', 'rerank', 'decide'] as const;
	const STEP_LABELS: Record<string, () => string> = {
		redact: m.progress_redact,
		classify: m.progress_classify,
		search: m.progress_search,
		rerank: m.progress_rerank,
		decide: m.progress_decide
	};
	const stepLabel = (s: string) => STEP_LABELS[s]?.() ?? s;

	let step = $state<string>('redact');
	const pending = $derived(data.need.status === 'new' || data.need.status === 'processing');

	onMount(() => {
		if (!pending) return;
		const es = new EventSource(`/api/needs/${data.need.id}/events`);
		es.addEventListener('step', (e) => (step = JSON.parse((e as MessageEvent).data).step));
		es.addEventListener('done', () => {
			es.close();
			invalidateAll();
		});
		es.addEventListener('timeout', () => es.close());
		es.onerror = () => {
			es.close();
			setTimeout(() => invalidateAll(), 2000);
		};
		return () => es.close();
	});
</script>

<svelte:head><title>{m.results_title()} | {m.app_name()}</title></svelte:head>

<div class="grid gap-8 lg:grid-cols-[1fr_18rem]">
	<div class="flex flex-col gap-8">
		<header>
			<h1 class="text-3xl font-bold">{m.results_title()}</h1>
			<blockquote class="border-primary bg-card mt-4 rounded-lg border-l-4 p-4 text-lg">{data.need.text}</blockquote>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				{#if data.need.areaSlug}<Badge>{areaLabel(data.need.areaSlug)}</Badge>{/if}
				{#each data.need.targetGroups as g (g)}<Badge variant="secondary">{groupLabel(g)}</Badge>{/each}
				{#if data.need.place}<Badge variant="outline">{data.need.place.name}, {m.report_powiat({ name: data.need.place.powiat })}</Badge>{/if}
				<span class="text-muted-foreground text-sm">{formatDay(data.need.createdAt, getLocale())}</span>
			</div>
		</header>

		{#if pending}
			<section aria-live="polite" aria-busy="true" class="bg-card border-border rounded-xl border p-6">
				<h2 class="text-xl font-semibold">{m.progress_title()}</h2>
				<Progress value={((STEPS.indexOf(step as (typeof STEPS)[number]) + 1) / STEPS.length) * 100} class="mt-4" aria-label={m.progress_title()} />
				<p class="mt-3">{stepLabel(step)}</p>
				<noscript><p class="mt-2">{m.progress_noscript()}</p></noscript>
			</section>
		{:else if data.need.status === 'moderation'}
			<Alert.Root>
				<ShieldIcon aria-hidden="true" />
				<Alert.Title>{m.results_moderation_title()}</Alert.Title>
				<Alert.Description>{m.results_moderation_text()}</Alert.Description>
			</Alert.Root>
		{:else}
			{#if data.matches.length}
				<section aria-labelledby="matches-title" aria-live="polite">
					<h2 id="matches-title" class="text-2xl font-bold">{m.results_matches_title({ count: String(data.matches.length) })}</h2>
					<p class="text-muted-foreground mt-1">{m.results_matches_help()}</p>
					<ol class="mt-4 grid gap-4 md:grid-cols-2">
						{#each data.matches as match, i (match.id)}
							<li><MatchCard {match} rank={i + 1} canAccept={data.canAccept} showRanks={data.showRanks} /></li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if data.challenge}
				<section aria-labelledby="challenge-title" class="border-primary bg-secondary rounded-xl border-2 p-6">
					<h2 id="challenge-title" class="flex items-center gap-2 text-2xl font-bold">
						<FlagIcon class="size-6" aria-hidden="true" />{m.results_challenge_title()}
					</h2>
					<p class="mt-2 text-lg">{m.results_challenge_text()}</p>
					<p class="mt-3 font-semibold">{data.challenge.title}</p>
					<p class="text-muted-foreground text-sm">{m.results_challenge_count({ count: String(data.challenge.needCount) })}</p>
					<div class="mt-4 flex flex-wrap gap-2">
						<Button href={localizeHref(`/challenges/${data.challenge.id}`)}>{m.results_challenge_open()}</Button>
						<Button href={localizeHref(`/ideas/new?challenge=${data.challenge.id}`)} variant="outline">{m.results_challenge_idea()}</Button>
					</div>
				</section>
			{/if}

			{#if data.uncertain.length}
				<section aria-labelledby="uncertain-title">
					<h2 id="uncertain-title" class="text-xl font-semibold">{m.results_uncertain_title()}</h2>
					<p class="text-muted-foreground mt-1">{m.results_uncertain_help()}</p>
					<ul class="mt-4 grid gap-4 md:grid-cols-2">
						{#each data.uncertain as match, i (match.id)}
							<li><MatchCard {match} rank={i + 1} canAccept={false} showRanks={data.showRanks} /></li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	</div>

	<aside class="flex flex-col gap-6">
		{#if data.similar.count > 0}
			<section class="bg-card border-border rounded-xl border p-4" aria-labelledby="similar-title">
				<h2 id="similar-title" class="flex items-center gap-2 font-semibold"><UsersIcon class="size-5" aria-hidden="true" />{m.similar_title()}</h2>
				<p class="mt-2">{m.similar_text({ count: String(data.similar.count) })}</p>
				<p class="text-muted-foreground mt-1 text-sm">
					{data.similar.powiats.map((p) => POWIAT_NAME.get(p) ?? p).join(', ')}
				</p>
				<p class="text-muted-foreground mt-2 text-sm">{m.similar_partner()}</p>
			</section>
		{/if}
		<StatusTimeline events={data.timeline} />
	</aside>
</div>
