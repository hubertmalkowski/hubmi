<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ChallengeMap from '$lib/components/ChallengeMap.svelte';
	import EasyRead from '$lib/components/EasyRead.svelte';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square-text';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import FlagIcon from '@lucide/svelte/icons/flag';

	let { data } = $props();

	const steps = $derived([
		{ icon: MessageSquareIcon, title: m.home_step1_title(), text: m.home_step1_text() },
		{ icon: LibraryIcon, title: m.home_step2_title(), text: m.home_step2_text() },
		{ icon: FlagIcon, title: m.home_step3_title(), text: m.home_step3_text() },
		{ icon: LightbulbIcon, title: m.home_step4_title(), text: m.home_step4_text() }
	]);
</script>

<section class="grid gap-8 py-4 lg:grid-cols-[1.2fr_1fr] lg:items-center">
	<div>
		<h1 class="text-4xl leading-tight font-bold text-balance sm:text-5xl">{m.home_title()}</h1>
		<EasyRead key="home.lead">
			<p class="text-muted-foreground mt-4 max-w-xl text-lg">{m.home_lead()}</p>
		</EasyRead>
		<div class="mt-6 flex flex-wrap gap-3">
			<Button href={localizeHref('/report')} size="lg" class="h-14 px-6 text-lg">{m.home_cta_report()}</Button>
			<Button href={localizeHref('/knowledge/library')} size="lg" variant="outline" class="h-14 px-6 text-lg"
				>{m.home_cta_library()}</Button
			>
		</div>
	</div>
	<dl class="grid grid-cols-2 gap-3">
		<div class="bg-card border-border rounded-xl border p-5">
			<dt class="text-muted-foreground text-sm">{m.home_stat_innovations()}</dt>
			<dd class="mt-1 text-4xl font-bold">{data.totals.innovations}</dd>
		</div>
		<div class="bg-card border-border rounded-xl border p-5">
			<dt class="text-muted-foreground text-sm">{m.home_stat_needs()}</dt>
			<dd class="mt-1 text-4xl font-bold">{data.totals.needs}</dd>
		</div>
		<div class="bg-card border-border rounded-xl border p-5">
			<dt class="text-muted-foreground text-sm">{m.home_stat_matched()}</dt>
			<dd class="mt-1 text-4xl font-bold">{data.totals.matched}</dd>
		</div>
		<div class="bg-card border-border rounded-xl border p-5">
			<dt class="text-muted-foreground text-sm">{m.home_stat_challenges()}</dt>
			<dd class="mt-1 text-4xl font-bold">{data.totals.open_challenges}</dd>
		</div>
	</dl>
</section>

<section class="mt-12" aria-labelledby="how">
	<h2 id="how" class="text-2xl font-bold">{m.home_how_title()}</h2>
	<ol class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each steps as s, i (i)}
			<li>
				<Card.Root class="h-full">
					<Card.Header>
						<span class="bg-accent text-accent-foreground grid size-10 place-items-center rounded-lg" aria-hidden="true">
							<s.icon class="size-5" />
						</span>
						<Card.Title><h3 class="text-base"><span class="sr-only">{i + 1}. </span>{s.title}</h3></Card.Title>
					</Card.Header>
					<Card.Content><p class="text-muted-foreground text-sm">{s.text}</p></Card.Content>
				</Card.Root>
			</li>
		{/each}
	</ol>
</section>

<section class="mt-12" aria-labelledby="map">
	<h2 id="map" class="sr-only">{m.home_map_title()}</h2>
	<ChallengeMap counts={data.byPowiat} title={m.home_map_title()} />
	<p class="mt-3"><a class="text-primary underline underline-offset-4" href={localizeHref('/knowledge')}>{m.home_map_more()}</a></p>
</section>
