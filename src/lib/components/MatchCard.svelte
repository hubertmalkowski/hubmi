<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { fitText, stageLabel } from '$lib/labels';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check-big';
	import CircleDotIcon from '@lucide/svelte/icons/circle-dot';
	import CircleDashedIcon from '@lucide/svelte/icons/circle-dashed';
	import ThumbsUpIcon from '@lucide/svelte/icons/thumbs-up';
	import { toast } from 'svelte-sonner';

	type Match = {
		id: string;
		slug: string;
		title: string;
		summary: string;
		stage: string;
		reason: string | null;
		fit: 'direct' | 'good' | 'partial' | 'weak';
		accepted: boolean;
		ranks: { bm25: number | null; knn: number | null; rrf: number; jev: number | null };
	};

	// compact: lower-confidence results, shown without the reason and the adapt/accept actions.
	let {
		match,
		rank,
		canAccept,
		showRanks,
		compact = false
	}: {
		match: Match;
		rank: number;
		canAccept: boolean;
		showRanks: boolean;
		compact?: boolean;
	} = $props();
	// follows the server value, and flips locally after a successful accept
	let accepted = $derived(match.accepted);

	const FitIcon = $derived(
		match.fit === 'direct' || match.fit === 'good'
			? CircleCheckIcon
			: match.fit === 'partial'
				? CircleDotIcon
				: CircleDashedIcon
	);
	const strong = $derived(match.fit === 'direct' || match.fit === 'good');

	async function accept() {
		const r = await fetch(`/api/matches/${match.id}/accept`, { method: 'POST' });
		if (r.ok) {
			accepted = true;
			toast.success(m.match_accepted_toast());
		}
	}
</script>

<article
	class="flex h-full flex-col gap-4 rounded-2xl border border-card-ring bg-card {compact
		? 'p-5'
		: 'p-6 sm:p-8'}"
>
	<p
		class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium {strong
			? 'text-primary'
			: 'text-muted-foreground'}"
	>
		<FitIcon class="size-4" aria-hidden="true" />{fitText(match.fit)}
		<span class="text-muted-foreground" aria-hidden="true">·</span>
		<span class="text-muted-foreground">{stageLabel(match.stage)}</span>
	</p>

	<h3 class="font-serif leading-tight font-semibold {compact ? 'text-xl' : 'text-2xl sm:text-3xl'}">
		<span class="sr-only">{m.match_rank({ rank: String(rank) })}</span>
		<a
			href={localizeHref(`/knowledge/library/${match.slug}`)}
			class="underline-offset-4 hover:underline">{match.title}</a
		>
	</h3>

	<p class="max-w-prose leading-relaxed {compact ? 'text-base text-muted-foreground' : 'text-lg'}">
		{match.summary}
	</p>

	{#if match.reason && !compact}
		<div class="max-w-prose border-l-4 border-primary/40 pl-4">
			<p class="text-sm font-semibold">{m.match_why()}</p>
			<p class="mt-1 leading-relaxed">{match.reason}</p>
		</div>
	{/if}

	{#if !compact}
		<div class="mt-auto flex flex-wrap gap-2 pt-2">
			<Button href={localizeHref(`/adapt/${match.slug}`)} size="lg" class="rounded-full"
				>{m.match_adapt()}</Button
			>
			<Button
				href={localizeHref(`/knowledge/library/${match.slug}`)}
				variant="outline"
				size="lg"
				class="rounded-full">{m.match_details()}</Button
			>
			{#if canAccept}
				<Button
					variant="ghost"
					size="lg"
					class="rounded-full"
					onclick={accept}
					disabled={accepted}
					aria-pressed={accepted}
				>
					<ThumbsUpIcon class="size-4" aria-hidden="true" />
					{accepted ? m.match_accepted() : m.match_accept()}
				</Button>
			{/if}
		</div>
	{/if}

	{#if showRanks}
		<p class="text-xs text-muted-foreground tabular-nums">
			BM25 #{match.ranks.bm25 ?? '–'} · kNN #{match.ranks.knn ?? '–'} · RRF #{match.ranks.rrf} · Jev
			{match.ranks.jev?.toFixed(2) ?? '–'}
		</p>
	{/if}
</article>
