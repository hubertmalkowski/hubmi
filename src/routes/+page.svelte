<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import VoiceInput from '$lib/components/VoiceInput.svelte';
	import { NEED_MIN, NEED_MAX } from '$lib/schemas/need';
	import { createClassifier } from '$lib/need-classifier.svelte';
	import { areaLabel, groupLabel } from '$lib/labels';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import ChallengeMap from '$lib/components/ChallengeMap.svelte';
	import EasyRead from '$lib/components/EasyRead.svelte';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square-text';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
	import FlagIcon from '@lucide/svelte/icons/flag';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import ShieldIcon from '@lucide/svelte/icons/shield-check';

	let { data } = $props();

	let text = $state('');
	let submitting = $state(false);
	let formEl: HTMLFormElement;
	let textarea: HTMLTextAreaElement | null = $state(null);
	const ready = $derived(text.trim().length >= NEED_MIN);
	const classifier = createClassifier(() => text);
	const classified = $derived(classifier.result);

	const examples = $derived([
		{ label: m.home_example_1_label(), text: m.home_example_1_text() },
		{ label: m.home_example_2_label(), text: m.home_example_2_text() },
		{ label: m.home_example_3_label(), text: m.home_example_3_text() },
		{ label: m.home_example_4_label(), text: m.home_example_4_text() }
	]);

	function useExample(t: string) {
		text = t;
		textarea?.focus();
	}

	function appendDictation(t: string) {
		text = text ? `${text.trimEnd()} ${t}` : t;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ready) {
			e.preventDefault();
			formEl.requestSubmit();
		}
	}

	const steps = $derived([
		{ icon: MessageSquareIcon, title: m.home_step1_title(), text: m.home_step1_text() },
		{ icon: LibraryIcon, title: m.home_step2_title(), text: m.home_step2_text() },
		{ icon: FlagIcon, title: m.home_step3_title(), text: m.home_step3_text() },
		{ icon: LightbulbIcon, title: m.home_step4_title(), text: m.home_step4_text() }
	]);
</script>

<section
	class="flex min-h-[calc(100svh-16rem)] flex-col items-center justify-center py-8 text-center"
	aria-labelledby="prompt-title"
>
	<h1
		id="prompt-title"
		class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
	>
		{m.home_prompt_title()}
	</h1>
	<EasyRead key="home.lead">
		<p class="mt-4 max-w-xl text-lg text-balance text-muted-foreground">{m.home_prompt_lead()}</p>
	</EasyRead>

	<form
		bind:this={formEl}
		method="POST"
		action={localizeHref('/report')}
		class="mt-8 w-full max-w-2xl text-left"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<div
			class="rounded-2xl border border-input bg-card shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-3 focus-within:ring-ring/50"
		>
			<label for="home-need" class="sr-only">{m.home_prompt_label()}</label>
			<textarea
				id="home-need"
				name="text"
				bind:this={textarea}
				bind:value={text}
				onkeydown={onKeydown}
				required
				minlength={NEED_MIN}
				maxlength={NEED_MAX}
				rows="3"
				aria-describedby="home-need-hint"
				placeholder={m.home_prompt_placeholder()}
				class="block field-sizing-content max-h-80 min-h-28 w-full resize-none bg-transparent px-5 pt-4 text-lg outline-none placeholder:text-muted-foreground focus-visible:outline-none"
			></textarea>
			<div class="flex items-end gap-2 px-3 pb-3">
				<div
					class="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-1.5 px-2"
					aria-live="polite"
					aria-busy={classifier.pending}
				>
					{#if classified}
						<span class="sr-only">{m.report_understood_title()}:</span>
						<Badge title={m.report_area()}>{areaLabel(classified.area.slug)}</Badge>
						{#each classified.target_groups as g (g.slug)}
							<Badge variant="secondary" title={m.report_groups()}>{groupLabel(g.slug)}</Badge>
						{/each}
						{#if classified.place}
							<Badge variant="outline">
								<MapPinIcon aria-hidden="true" />{classified.place.name}
							</Badge>
						{/if}
					{:else if classifier.pending}
						<span class="flex items-center gap-2 text-sm text-muted-foreground">
							<Spinner />{m.report_classifying()}
						</span>
					{/if}
				</div>
				<input type="hidden" name="place_teryt" value={classified?.place?.teryt ?? ''} />
				<VoiceInput onText={appendDictation} compact />
				<Button
					type="submit"
					size="icon-lg"
					class="rounded-full"
					disabled={submitting || !ready}
					aria-label={m.report_submit()}
					title={m.report_submit()}
				>
					{#if submitting}<Spinner />{:else}<ArrowUpIcon class="size-5" aria-hidden="true" />{/if}
				</Button>
			</div>
		</div>
		<p id="home-need-hint" class="mt-2 px-2 text-sm text-muted-foreground">
			{m.home_prompt_hint({ min: String(NEED_MIN) })}
		</p>
		{#if classified}
			<div class="mt-3 flex flex-col gap-3" aria-live="polite">
				{#if classified.urgent}
					<Alert.Root variant="destructive">
						<TriangleAlertIcon aria-hidden="true" />
						<Alert.Title>{m.report_urgent_title()}</Alert.Title>
						<Alert.Description>{m.report_urgent_text()}</Alert.Description>
					</Alert.Root>
				{/if}
				{#if classified.is_need < 0.3}
					<Alert.Root>
						<Alert.Title>{m.report_not_need_title()}</Alert.Title>
						<Alert.Description>{m.report_not_need_text()}</Alert.Description>
					</Alert.Root>
				{/if}
				{#if classified.pii >= 0.5}
					<Alert.Root>
						<ShieldIcon aria-hidden="true" />
						<Alert.Title>{m.report_pii_title()}</Alert.Title>
						<Alert.Description>{m.report_pii_text()}</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
		{/if}
	</form>

	<div class="mt-6 flex max-w-2xl flex-col items-center gap-3">
		<h2 class="text-sm text-muted-foreground">{m.home_examples_title()}</h2>
		<ul class="flex flex-wrap justify-center gap-2">
			{#each examples as ex (ex.label)}
				<li>
					<Button
						type="button"
						variant="outline"
						class="rounded-full"
						onclick={() => useExample(ex.text)}>{ex.label}</Button
					>
				</li>
			{/each}
		</ul>
		<a
			href={localizeHref('/knowledge/library')}
			class="mt-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
			>{m.home_or_browse()}<ArrowRightIcon class="size-4" aria-hidden="true" /></a
		>
	</div>
</section>

<section class="mt-12">
	<dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<div class="rounded-xl border border-border bg-card p-5">
			<dt class="text-sm text-muted-foreground">{m.home_stat_innovations()}</dt>
			<dd class="mt-1 text-4xl font-bold">{data.totals.innovations}</dd>
		</div>
		<div class="rounded-xl border border-border bg-card p-5">
			<dt class="text-sm text-muted-foreground">{m.home_stat_needs()}</dt>
			<dd class="mt-1 text-4xl font-bold">{data.totals.needs}</dd>
		</div>
		<div class="rounded-xl border border-border bg-card p-5">
			<dt class="text-sm text-muted-foreground">{m.home_stat_matched()}</dt>
			<dd class="mt-1 text-4xl font-bold">{data.totals.matched}</dd>
		</div>
		<div class="rounded-xl border border-border bg-card p-5">
			<dt class="text-sm text-muted-foreground">{m.home_stat_challenges()}</dt>
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
						<span
							class="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground"
							aria-hidden="true"
						>
							<s.icon class="size-5" />
						</span>
						<Card.Title
							><h3 class="text-base">
								<span class="sr-only">{i + 1}. </span>{s.title}
							</h3></Card.Title
						>
					</Card.Header>
					<Card.Content><p class="text-sm text-muted-foreground">{s.text}</p></Card.Content>
				</Card.Root>
			</li>
		{/each}
	</ol>
</section>

<section class="mt-12" aria-labelledby="map">
	<h2 id="map" class="sr-only">{m.home_map_title()}</h2>
	<ChallengeMap counts={data.byPowiat} title={m.home_map_title()} />
	<p class="mt-3">
		<a class="text-primary underline underline-offset-4" href={localizeHref('/knowledge')}
			>{m.home_map_more()}</a
		>
	</p>
</section>
