<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import VoiceInput from '$lib/components/VoiceInput.svelte';
	import GminaCombobox from '$lib/components/GminaCombobox.svelte';
	import { NEED_MIN, NEED_MAX } from '$lib/schemas/need';
	import { createClassifier } from '$lib/need-classifier.svelte';
	import { areaLabel } from '$lib/labels';
	import * as Alert from '$lib/components/ui/alert';
	import ChallengeMap from '$lib/components/ChallengeMap.svelte';
	import EasyRead from '$lib/components/EasyRead.svelte';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import ShieldIcon from '@lucide/svelte/icons/shield-check';
	import LibraryIcon from '@lucide/svelte/icons/library-big';
	import { reveal, pop } from '$lib/motion';

	let { data } = $props();

	let text = $state('');
	let submitting = $state(false);
	let formEl: HTMLFormElement;
	let textarea: HTMLTextAreaElement | null = $state(null);
	const ready = $derived(text.trim().length >= NEED_MIN);
	const classifier = createClassifier(() => text);
	const classified = $derived(classifier.result);
	// Area shown in the send button only when the classifier is reasonably sure. Intake
	// confidences run low (top area ~0.2-0.3 across ~12 areas), so this is tuned empirically.
	const SCOPE_MIN_CONFIDENCE = 0.25;
	const scope = $derived(
		classified &&
			classified.area.confidence >= SCOPE_MIN_CONFIDENCE &&
			classified.area.slug !== 'other'
			? areaLabel(classified.area.slug)
			: null
	);

	// Prefill the gmina on each new classification, unless the user already picked one.
	let placeTeryt = $state('');
	$effect(() => {
		const place = classified?.place;
		untrack(() => {
			if (place && !placeTeryt) placeTeryt = place.teryt;
		});
	});

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
		{ title: m.home_step1_title(), text: m.home_step1_text() },
		{ title: m.home_step2_title(), text: m.home_step2_text() },
		{ title: m.home_step3_title(), text: m.home_step3_text() },
		{ title: m.home_step4_title(), text: m.home_step4_text() }
	]);

	const stats = $derived([
		{ label: m.home_stat_innovations(), value: data.totals.innovations },
		{ label: m.home_stat_needs(), value: data.totals.needs },
		{ label: m.home_stat_matched(), value: data.totals.matched },
		{ label: m.home_stat_challenges(), value: data.totals.open_challenges }
	]);
</script>

<div class="mx-auto max-w-[110rem] px-2 pt-2 sm:px-8 lg:px-12">
	<section
		class="relative isolate overflow-hidden rounded-[2rem] bg-hero px-4 py-14 text-center sm:px-10 sm:py-20 lg:py-28"
		aria-labelledby="prompt-title"
	>
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-96 max-w-5xl rounded-full bg-primary/15 blur-3xl"
		></div>
		<h1
			id="prompt-title"
			data-reveal
			{@attach reveal()}
			class="mx-auto max-w-4xl text-5xl leading-[1.05] font-semibold text-balance sm:text-6xl lg:text-7xl"
		>
			{m.home_prompt_title()}
		</h1>
		<div data-reveal {@attach reveal({ delay: 0.08 })}>
			<EasyRead key="home.lead">
				<p class="mx-auto mt-5 max-w-xl text-lg text-balance text-muted-foreground sm:text-xl">
					{m.home_prompt_lead()}
				</p>
			</EasyRead>
		</div>

		<form
			bind:this={formEl}
			method="POST"
			action={localizeHref('/report')}
			data-reveal
			{@attach reveal({ delay: 0.16 })}
			class="mx-auto mt-10 w-full max-w-2xl text-left"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<div
				class="rounded-[1.75rem] border-2 border-foreground/80 bg-card shadow-xl shadow-primary/5 has-[textarea:focus]:border-foreground has-[textarea:focus]:shadow-[0_0_0_4px_var(--focus),0_0_0_7px_var(--focus-ink)]"
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
					class="block field-sizing-content max-h-80 min-h-28 w-full resize-none rounded-t-[1.75rem] bg-transparent px-6 pt-5 text-lg outline-none placeholder:text-muted-foreground focus-visible:shadow-none focus-visible:outline-none"
				></textarea>
				<div class="flex items-end gap-2 px-3 pb-3">
					<div class="flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-2 pl-2">
						<GminaCombobox
							places={data.places}
							bind:value={placeTeryt}
							id="home-place"
							label={m.report_place_label()}
							placeholder={m.home_place_placeholder()}
							class="min-w-0 sm:max-w-64"
						/>
						<div
							class="flex min-w-0 flex-wrap items-center gap-1.5"
							aria-live="polite"
							aria-busy={classifier.pending}
						>
							{#if classifier.pending && !classified}
								<span class="flex items-center gap-2 text-sm text-muted-foreground">
									<Spinner />{m.report_classifying()}
								</span>
							{/if}
						</div>
					</div>

					<VoiceInput onText={appendDictation} compact />
					<Button
						type="submit"
						size="icon-lg"
						class={['h-12 min-w-12 rounded-full', scope && 'sm:w-auto sm:px-5']}
						disabled={submitting || !ready}
						aria-label={scope ? m.home_search_in({ area: scope }) : m.report_submit()}
						title={m.report_submit()}
					>
						{#if scope}
							{#key scope}
								<span class="hidden max-w-56 truncate sm:inline" {@attach pop()}
									>{m.home_search_in({ area: scope })}</span
								>
							{/key}
						{/if}
						{#if submitting}<Spinner />{:else if scope}<ArrowRightIcon
								class="size-5"
								aria-hidden="true"
							/>{:else}<ArrowUpIcon class="size-5" aria-hidden="true" />{/if}
					</Button>
				</div>
			</div>
			<p id="home-need-hint" class="mt-3 px-4 text-sm text-muted-foreground">
				{m.home_prompt_hint({ min: String(NEED_MIN) })}
			</p>
			{#if classified}
				<div class="mt-3 flex flex-col gap-3" aria-live="polite">
					{#if classified.preview.length && !classified.abusive}
						<section
							class="rounded-2xl border border-card-ring bg-card/80 p-4 sm:p-5"
							aria-labelledby="preview-title"
							{@attach pop()}
						>
							<h2
								id="preview-title"
								class="flex items-center gap-2 font-sans text-sm font-semibold tracking-normal"
							>
								<LibraryIcon class="size-4" aria-hidden="true" />{m.home_preview_title()}
							</h2>
							<ul class="mt-2 flex flex-col gap-1">
								{#each classified.preview as p, i (p.slug)}
									<li class="font-serif text-lg leading-snug" {@attach pop(0.05 * (i + 1))}>
										{p.title}
									</li>
								{/each}
							</ul>
							<p class="mt-2 text-sm text-muted-foreground">{m.home_preview_note()}</p>
						</section>
					{/if}
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
					{#if classified.abusive}
						<Alert.Root variant="destructive">
							<ShieldIcon aria-hidden="true" />
							<Alert.Title>{m.report_abuse_title()}</Alert.Title>
							<Alert.Description>{m.report_abuse_text()}</Alert.Description>
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

		<div
			class="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3"
			data-reveal
			{@attach reveal({ delay: 0.24 })}
		>
			<h2 class="font-sans text-sm tracking-normal text-muted-foreground">
				{m.home_examples_title()}
			</h2>
			<ul class="flex flex-wrap justify-center gap-2">
				{#each examples as ex (ex.label)}
					<li>
						<Button
							type="button"
							variant="outline"
							class="h-11 rounded-full bg-card px-4"
							onclick={() => useExample(ex.text)}>{ex.label}</Button
						>
					</li>
				{/each}
			</ul>
			<a
				href={localizeHref('/knowledge/library')}
				class="mt-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-medium text-primary underline-offset-4 hover:underline"
				>{m.home_or_browse()}<ArrowRightIcon class="size-4" aria-hidden="true" /></a
			>
		</div>
	</section>
</div>

<div class="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
	<section class="mt-20" aria-labelledby="stats">
		<h2 id="stats" class="text-3xl font-semibold" data-reveal {@attach reveal()}>
			{m.home_stats_title()}
		</h2>
		<dl class="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
			{#each stats as st, i (st.label)}
				<div
					class="border-t-4 border-primary pt-4"
					data-reveal
					{@attach reveal({ delay: i * 0.08 })}
				>
					<dt class="text-base text-muted-foreground">{st.label}</dt>
					<dd class="mt-1 font-serif text-5xl font-semibold tabular-nums sm:text-6xl">
						{st.value}
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section class="mt-20" aria-labelledby="how">
		<h2 id="how" class="text-3xl font-semibold" data-reveal {@attach reveal()}>
			{m.home_how_title()}
		</h2>
		<ol class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
			{#each steps as s, i (i)}
				<li class="flex flex-col gap-3" data-reveal {@attach reveal({ delay: i * 0.08 })}>
					<span
						class="grid size-12 place-items-center rounded-full bg-primary font-serif text-xl font-semibold text-primary-foreground"
						aria-hidden="true">{i + 1}</span
					>
					<h3 class="text-lg font-semibold">
						<span class="sr-only">{i + 1}. </span>{s.title}
					</h3>
					<p class="text-muted-foreground">{s.text}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="mt-20" aria-labelledby="map" data-reveal {@attach reveal()}>
		<h2 id="map" class="sr-only">{m.home_map_title()}</h2>
		<ChallengeMap
			counts={data.byPowiat}
			title={m.home_map_title()}
			href={(t) => localizeHref(`/challenges?powiat=${t}`)}
		/>
		<p class="mt-3">
			<a class="text-primary underline underline-offset-4" href={localizeHref('/knowledge')}
				>{m.home_map_more()}</a
			>
		</p>
	</section>
</div>
