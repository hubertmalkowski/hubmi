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
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { reveal } from '$lib/motion';

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

<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
	<div class="flex min-w-0 flex-col gap-12">
		<header>
			<p class="text-sm font-medium text-muted-foreground">
				{m.results_your_report()} · {formatDay(data.need.createdAt, getLocale())}
			</p>
			<h1 class="mt-2 text-4xl leading-tight font-semibold sm:text-5xl">{m.results_title()}</h1>
			<blockquote
				class="mt-6 max-w-prose border-l-4 border-primary pl-5 text-xl leading-relaxed text-foreground"
			>
				{data.need.text}
			</blockquote>
			<div class="mt-4 flex flex-wrap items-center gap-2 pl-6">
				{#if data.need.areaSlug}<Badge>{areaLabel(data.need.areaSlug)}</Badge>{/if}
				{#each data.need.targetGroups as g (g)}<Badge variant="secondary">{groupLabel(g)}</Badge
					>{/each}
				{#if data.need.place}<Badge variant="outline"
						>{data.need.place.name}, {m.report_powiat({ name: data.need.place.powiat })}</Badge
					>{/if}
			</div>
		</header>

		{#if pending}
			<section aria-live="polite" aria-busy="true" class="rounded-3xl bg-hero p-6 sm:p-8">
				<h2 class="text-2xl font-semibold">{m.progress_title()}</h2>
				<Progress
					value={((STEPS.indexOf(step as (typeof STEPS)[number]) + 1) / STEPS.length) * 100}
					class="mt-5"
					aria-label={m.progress_title()}
				/>
				<p class="mt-3 text-lg">{stepLabel(step)}</p>
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
					<h2 id="matches-title" class="text-3xl font-semibold">
						{m.results_matches_title({ count: String(data.matches.length) })}
					</h2>
					<p class="mt-2 max-w-prose text-lg text-muted-foreground">{m.results_matches_help()}</p>
					<ol class="mt-6 flex flex-col gap-4">
						{#each data.matches as match, i (match.id)}
							<li data-reveal {@attach reveal({ delay: i * 0.06 })}>
								<MatchCard
									{match}
									rank={i + 1}
									canAccept={data.canAccept}
									showRanks={data.showRanks}
								/>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			{#if data.challenge}
				<section
					aria-labelledby="challenge-title"
					class="rounded-3xl bg-hero p-6 sm:p-10"
					data-reveal
					{@attach reveal()}
				>
					<span
						class="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"
						aria-hidden="true"
					>
						<FlagIcon class="size-6" />
					</span>
					<h2 id="challenge-title" class="mt-5 text-3xl leading-tight font-semibold">
						{m.results_challenge_title()}
					</h2>
					<p class="mt-3 max-w-prose text-lg leading-relaxed">{m.results_challenge_text()}</p>

					<a
						href={localizeHref(`/challenges/${data.challenge.id}`)}
						class="group mt-6 flex items-center gap-4 rounded-2xl border border-card-ring bg-card p-5 hover:border-primary"
					>
						<span class="min-w-0 flex-1">
							<span class="block text-sm font-medium text-primary"
								>{m.results_challenge_label()}</span
							>
							<span class="mt-1 block font-serif text-xl leading-snug font-semibold"
								>{data.challenge.title}</span
							>
							<span class="mt-1 block text-sm text-muted-foreground"
								>{m.results_challenge_count({ count: String(data.challenge.needCount) })}</span
							>
						</span>
						<ArrowRightIcon
							class="size-5 shrink-0 transition-transform group-hover:translate-x-1"
							aria-hidden="true"
						/>
					</a>

					<div class="mt-6 flex flex-wrap gap-3">
						<Button
							href={localizeHref(`/ideas/new?challenge=${data.challenge.id}`)}
							size="lg"
							class="h-12 rounded-full px-6 text-base">{m.results_challenge_idea()}</Button
						>
					</div>
				</section>
			{/if}

			{#if data.uncertain.length}
				<section aria-labelledby="uncertain-title">
					<h2 id="uncertain-title" class="text-2xl font-semibold">{m.results_uncertain_title()}</h2>
					<p class="mt-2 max-w-prose text-muted-foreground">{m.results_uncertain_help()}</p>
					<ul class="mt-6 grid gap-4 md:grid-cols-2">
						{#each data.uncertain as match, i (match.id)}
							<li data-reveal {@attach reveal({ delay: i * 0.06 })}>
								<MatchCard
									{match}
									rank={i + 1}
									canAccept={false}
									showRanks={data.showRanks}
									compact
								/>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	</div>

	<aside class="flex flex-col gap-8 lg:sticky lg:top-8 lg:self-start">
		{#if data.similar.count > 0}
			<section
				class="rounded-2xl border border-card-ring bg-card p-5"
				aria-labelledby="similar-title"
			>
				<h2 id="similar-title" class="flex items-center gap-2 text-xl font-semibold">
					<UsersIcon class="size-5" aria-hidden="true" />{m.similar_title()}
				</h2>
				<p class="mt-2">{m.similar_text({ count: String(data.similar.count) })}</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{data.similar.powiats.map((p) => POWIAT_NAME.get(p) ?? p).join(', ')}
				</p>
				<p class="mt-2 text-sm text-muted-foreground">{m.similar_partner()}</p>
			</section>
		{/if}
		<StatusTimeline events={data.timeline} />
	</aside>
</div>
