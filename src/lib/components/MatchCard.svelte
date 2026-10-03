<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import Highlighted from './Highlighted.svelte';
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
		highlights: Partial<Record<'title' | 'summary' | 'description', string[]>>;
		accepted: boolean;
		ranks: { bm25: number | null; knn: number | null; rrf: number; jev: number | null };
	};

	let {
		match,
		rank,
		canAccept,
		showRanks
	}: { match: Match; rank: number; canAccept: boolean; showRanks: boolean } = $props();
	// follows the server value, and flips locally after a successful accept
	let accepted = $derived(match.accepted);

	const FitIcon = $derived(
		match.fit === 'direct' || match.fit === 'good'
			? CircleCheckIcon
			: match.fit === 'partial'
				? CircleDotIcon
				: CircleDashedIcon
	);
	const keywords = $derived(
		[...(match.highlights.summary ?? []), ...(match.highlights.description ?? [])].slice(0, 2)
	);

	async function accept() {
		const r = await fetch(`/api/matches/${match.id}/accept`, { method: 'POST' });
		if (r.ok) {
			accepted = true;
			toast.success(m.match_accepted_toast());
		}
	}
</script>

<Card.Root class="h-full">
	<Card.Header>
		<div class="flex flex-wrap items-center gap-2">
			<Badge
				variant={match.fit === 'direct' || match.fit === 'good' ? 'default' : 'secondary'}
				class="gap-1"
			>
				<FitIcon class="size-3.5" aria-hidden="true" />{fitText(match.fit)}
			</Badge>
			<Badge variant="outline">{stageLabel(match.stage)}</Badge>
		</div>
		<Card.Title>
			<h3 class="text-xl leading-snug">
				<span class="sr-only">{m.match_rank({ rank: String(rank) })}</span>
				{#if match.highlights.title?.[0]}<Highlighted
						fragment={match.highlights.title[0]}
					/>{:else}{match.title}{/if}
			</h3>
		</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		<p>
			{#if match.highlights.summary?.[0]}<Highlighted
					fragment={match.highlights.summary[0]}
				/>{:else}{match.summary}{/if}
		</p>
		{#if match.reason}
			<p class="rounded-md bg-secondary p-3 text-sm">
				<strong>{m.match_why()}</strong>
				{match.reason}
			</p>
		{/if}
		{#if keywords.length && !match.highlights.summary}
			<p class="text-sm text-muted-foreground">
				<span class="font-semibold">{m.match_keywords()}</span>
				{#each keywords as k, i (i)}<span>… <Highlighted fragment={k} /> …</span>{/each}
			</p>
		{/if}
		{#if showRanks}
			<p class="text-xs text-muted-foreground tabular-nums">
				BM25 #{match.ranks.bm25 ?? '–'} · kNN #{match.ranks.knn ?? '–'} · RRF #{match.ranks.rrf} · Jev
				{match.ranks.jev?.toFixed(2) ?? '–'}
			</p>
		{/if}
	</Card.Content>
	<Card.Footer class="flex flex-wrap gap-2">
		<Button href={localizeHref(`/knowledge/library/${match.slug}`)} variant="outline"
			>{m.match_details()}</Button
		>
		<Button href={localizeHref(`/adapt/${match.slug}`)}>{m.match_adapt()}</Button>
		{#if canAccept}
			<Button variant="ghost" onclick={accept} disabled={accepted} aria-pressed={accepted}>
				<ThumbsUpIcon class="size-4" aria-hidden="true" />
				{accepted ? m.match_accepted() : m.match_accept()}
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
