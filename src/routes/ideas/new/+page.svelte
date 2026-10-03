<script lang="ts">
	// Fiszka wizard: four short steps. Without JavaScript all steps show as one form.
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import CheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleIcon from '@lucide/svelte/icons/circle';

	let { data, form } = $props();

	const v = (k: string) => (form?.values?.[k] as string | undefined) ?? '';
	let title = $state(v('title'));
	let essence = $state(v('essence'));
	let forWhom = $state(v('for_whom'));
	let howItWorks = $state(v('how_it_works'));
	let stage = $state(v('stage') || 'idea');

	let js = $state(false);
	let step = $state(0);
	let checks = $state<Record<string, number>>({});
	let timer: ReturnType<typeof setTimeout> | undefined;
	let headings: HTMLElement[] = [];

	onMount(() => (js = true));

	const STEP_TITLES = $derived([
		m.idea_step_what(),
		m.idea_step_who(),
		m.idea_step_how(),
		m.idea_step_stage()
	]);
	const CHECKS = $derived([
		['has_problem', m.idea_check_problem()],
		['has_beneficiary', m.idea_check_beneficiary()],
		['has_mechanism', m.idea_check_mechanism()],
		['has_novelty', m.idea_check_novelty()],
		['has_stage_evidence', m.idea_check_stage()]
	] as const);

	function schedule() {
		clearTimeout(timer);
		timer = setTimeout(check, 900);
	}
	async function check() {
		if ((essence + forWhom + howItWorks).trim().length < 30) return;
		const r = await fetch('/api/ideas/completeness', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title, essence, for_whom: forWhom, how_it_works: howItWorks, stage })
		});
		if (r.ok) checks = (await r.json()).checks;
	}
	function go(n: number) {
		step = n;
		queueMicrotask(() => headings[n]?.focus());
	}
	function onSubmit(e: SubmitEvent) {
		const f = e.currentTarget as HTMLFormElement;
		if (f.checkValidity()) return;
		e.preventDefault();
		const bad = f.querySelector<HTMLElement>(':invalid:not(fieldset)');
		const fs = bad?.closest('fieldset');
		const idx = fs ? [...f.querySelectorAll('fieldset')].indexOf(fs) : 0;
		step = Math.max(0, idx);
		setTimeout(() => {
			(bad as HTMLInputElement | null)?.reportValidity();
			bad?.focus();
		});
	}
	const err = (k: string) => (form?.errors as Record<string, string[]> | undefined)?.[k]?.length;
</script>

<svelte:head><title>{m.idea_new_title()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.idea_new_title()}</h1>
<p class="mt-2 max-w-3xl text-lg text-muted-foreground">{m.idea_new_lead()}</p>
{#if data.challenge}
	<p class="mt-4 rounded-lg bg-secondary p-3">
		{m.idea_for_challenge({ title: data.challenge.title })}
	</p>
{/if}

<div class="mt-6 grid gap-8 lg:grid-cols-[1fr_18rem]">
	<form
		method="POST"
		class="flex flex-col gap-6"
		oninput={schedule}
		novalidate={js}
		onsubmit={onSubmit}
	>
		<input type="hidden" name="challenge_id" value={data.challenge?.id ?? ''} />
		{#if js}
			<ol class="flex flex-wrap gap-2" aria-label={m.idea_steps()}>
				{#each STEP_TITLES as t, i (i)}
					<li>
						<button
							type="button"
							onclick={() => go(i)}
							aria-current={step === i ? 'step' : undefined}
							class="min-h-11 rounded-full border border-border px-4 text-sm font-medium aria-[current=step]:bg-primary aria-[current=step]:text-primary-foreground"
						>
							{i + 1}. {t}
						</button>
					</li>
				{/each}
			</ol>
		{/if}

		<fieldset hidden={js && step !== 0} class="flex flex-col gap-4">
			<legend bind:this={headings[0]} tabindex="-1" class="text-xl font-semibold"
				>{m.idea_step_what()}</legend
			>
			<div class="flex flex-col gap-2">
				<Label for="title">{m.idea_field_title()}</Label>
				<Input
					id="title"
					name="title"
					bind:value={title}
					required
					minlength={5}
					maxlength={140}
					aria-invalid={err('title') ? 'true' : undefined}
					class="min-h-11 text-base"
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="essence">{m.idea_field_essence()}</Label>
				<p id="essence-help" class="text-sm text-muted-foreground">{m.idea_field_essence_help()}</p>
				<Textarea
					id="essence"
					name="essence"
					rows={5}
					bind:value={essence}
					required
					minlength={20}
					aria-describedby="essence-help"
					aria-invalid={err('essence') ? 'true' : undefined}
				/>
			</div>
		</fieldset>

		<fieldset hidden={js && step !== 1} class="flex flex-col gap-4">
			<legend bind:this={headings[1]} tabindex="-1" class="text-xl font-semibold"
				>{m.idea_step_who()}</legend
			>
			<div class="flex flex-col gap-2">
				<Label for="for_whom">{m.idea_field_for_whom()}</Label>
				<Textarea
					id="for_whom"
					name="for_whom"
					rows={4}
					bind:value={forWhom}
					required
					minlength={5}
					aria-invalid={err('for_whom') ? 'true' : undefined}
				/>
			</div>
		</fieldset>

		<fieldset hidden={js && step !== 2} class="flex flex-col gap-4">
			<legend bind:this={headings[2]} tabindex="-1" class="text-xl font-semibold"
				>{m.idea_step_how()}</legend
			>
			<div class="flex flex-col gap-2">
				<Label for="how_it_works">{m.idea_field_how()}</Label>
				<p id="how-help" class="text-sm text-muted-foreground">{m.idea_field_how_help()}</p>
				<Textarea
					id="how_it_works"
					name="how_it_works"
					rows={6}
					bind:value={howItWorks}
					required
					minlength={20}
					aria-describedby="how-help"
					aria-invalid={err('how_it_works') ? 'true' : undefined}
				/>
			</div>
		</fieldset>

		<fieldset hidden={js && step !== 3} class="flex flex-col gap-4">
			<legend bind:this={headings[3]} tabindex="-1" class="text-xl font-semibold"
				>{m.idea_step_stage()}</legend
			>
			<RadioGroup.Root name="stage" bind:value={stage} class="flex flex-col gap-3">
				{#each [['idea', m.stage_idea()], ['prototype', m.stage_prototype()], ['micro_tested', m.stage_micro_tested()]] as [val, label] (val)}
					<div class="flex min-h-11 items-center gap-3">
						<RadioGroup.Item value={val} id="stage-{val}" />
						<Label for="stage-{val}" class="text-base">{label}</Label>
					</div>
				{/each}
			</RadioGroup.Root>
		</fieldset>

		{#if form?.errors}
			<p class="font-medium text-destructive" role="alert">{m.idea_form_errors()}</p>
		{/if}

		<div class="flex flex-wrap gap-2">
			{#if js && step > 0}<Button type="button" variant="outline" onclick={() => go(step - 1)}
					>{m.idea_prev()}</Button
				>{/if}
			{#if js && step < 3}
				<Button type="button" onclick={() => go(step + 1)}>{m.idea_next()}</Button>
			{:else}
				<Button type="submit" size="lg">{m.idea_submit()}</Button>
			{/if}
		</div>
		<p class="text-sm text-muted-foreground">
			{m.idea_canvas_hint()}
			<a class="underline underline-offset-4" href={localizeHref('/knowledge/materials#canvas')}
				>{m.knowledge_materials()}</a
			>
		</p>
	</form>

	<aside>
		<Card.Root class="sticky top-24">
			<Card.Header>
				<Card.Title><h2 class="text-lg">{m.idea_checklist_title()}</h2></Card.Title>
				<Card.Description>{m.idea_checklist_help()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul class="flex flex-col gap-2" aria-live="polite">
					{#each CHECKS as [key, label] (key)}
						{@const ok = (checks[key] ?? 0) >= 0.6}
						<li class="flex items-start gap-2">
							{#if ok}<CheckIcon
									class="mt-0.5 size-5 shrink-0 text-primary"
									aria-hidden="true"
								/>{:else}<CircleIcon
									class="mt-0.5 size-5 shrink-0 text-muted-foreground"
									aria-hidden="true"
								/>{/if}
							<span
								>{label}<span class="sr-only"
									>: {ok ? m.idea_check_done() : m.idea_check_missing()}</span
								></span
							>
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	</aside>
</div>
