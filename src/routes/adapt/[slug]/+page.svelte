<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Spinner } from '$lib/components/ui/spinner';
	import Markdown from '$lib/components/Markdown.svelte';
	import PrinterIcon from '@lucide/svelte/icons/printer';

	let { data } = $props();

	let institutionType = $state('gmina (OPS/CUS)');
	let placeTeryt = $state('');
	let populationBand = $state('5-20 tys.');
	let budgetBand = $state('do 50 tys. zł rocznie');
	let staff = $state('');
	let notes = $state('');
	let services = $state<string[]>([]);
	let sheet = $state('');
	let busy = $state(false);
	let status = $state('');

	const SERVICES = $derived([
		['ops', m.adapt_svc_ops()],
		['cus', m.adapt_svc_cus()],
		['transport', m.adapt_svc_transport()],
		['volunteers', m.adapt_svc_volunteers()],
		['library', m.adapt_svc_library()],
		['ngo', m.adapt_svc_ngo()]
	] as const);
	const sel = 'border-input bg-background min-h-11 rounded-md border px-3 text-base';

	async function generate(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		sheet = '';
		status = m.adapt_generating();
		try {
			const res = await fetch('/api/adapt', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					innovation_slug: data.innovation.slug,
					profile: {
						institutionType,
						placeTeryt: placeTeryt || undefined,
						populationBand,
						budgetBand,
						existingServices: services,
						staff,
						notes
					}
				})
			});
			if (!res.ok || !res.body) throw new Error();
			const reader = res.body.getReader();
			const dec = new TextDecoder();
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				sheet += dec.decode(value, { stream: true });
			}
			status = m.adapt_done();
		} catch {
			status = m.adapt_error();
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{m.adapt_title()} | {m.app_name()}</title></svelte:head>

<div class="no-print">
	<nav aria-label={m.breadcrumb()} class="text-sm text-muted-foreground">
		<a
			class="underline underline-offset-4"
			href={localizeHref(`/knowledge/library/${data.innovation.slug}`)}>{data.innovation.title}</a
		>
		/ <span aria-current="page">{m.adapt_title()}</span>
	</nav>
	<h1 class="mt-3 text-3xl font-bold">{m.adapt_title()}</h1>
	<p class="mt-2 max-w-3xl text-lg text-muted-foreground">
		{m.adapt_lead({ title: data.innovation.title })}
	</p>
</div>

<div class="mt-6 grid gap-8 lg:grid-cols-[22rem_1fr]">
	<form class="no-print flex flex-col gap-4" onsubmit={generate}>
		<div class="flex flex-col gap-2">
			<Label for="itype">{m.adapt_institution()}</Label>
			<select id="itype" bind:value={institutionType} class={sel}>
				{#each ['gmina (OPS/CUS)', 'powiat (PCPR)', 'organizacja pozarządowa', 'szkoła lub biblioteka'] as o (o)}<option
						value={o}>{o}</option
					>{/each}
			</select>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="gmina">{m.adapt_gmina()}</Label>
			<select id="gmina" bind:value={placeTeryt} class={sel}>
				<option value="">{m.report_place_unknown()}</option>
				{#each data.gminas as g (g.teryt)}<option value={g.teryt}>{g.name} ({g.powiat})</option
					>{/each}
			</select>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="pop">{m.adapt_population()}</Label>
			<select id="pop" bind:value={populationBand} class={sel}>
				{#each ['do 5 tys.', '5-20 tys.', '20-50 tys.', 'powyżej 50 tys.'] as o (o)}<option
						value={o}>{o}</option
					>{/each}
			</select>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="budget">{m.adapt_budget()}</Label>
			<select id="budget" bind:value={budgetBand} class={sel}>
				{#each ['do 50 tys. zł rocznie', '50-200 tys. zł rocznie', 'powyżej 200 tys. zł rocznie'] as o (o)}<option
						value={o}>{o}</option
					>{/each}
			</select>
		</div>
		<fieldset class="flex flex-col gap-2">
			<legend class="text-sm font-medium">{m.adapt_services()}</legend>
			{#each SERVICES as [key, label] (key)}
				<div class="flex min-h-11 items-center gap-3">
					<Checkbox
						id="svc-{key}"
						checked={services.includes(label)}
						onCheckedChange={(v) =>
							(services = v ? [...services, label] : services.filter((s) => s !== label))}
					/>
					<Label for="svc-{key}" class="font-normal">{label}</Label>
				</div>
			{/each}
		</fieldset>
		<div class="flex flex-col gap-2">
			<Label for="staff">{m.adapt_staff()}</Label>
			<Textarea
				id="staff"
				rows={2}
				bind:value={staff}
				maxlength={200}
				placeholder={m.adapt_staff_placeholder()}
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="notes">{m.adapt_notes()}</Label>
			<Textarea id="notes" rows={3} bind:value={notes} maxlength={1000} />
		</div>
		<Button type="submit" size="lg" disabled={busy}
			>{#if busy}<Spinner />{/if}{m.adapt_generate()}</Button
		>
		<p class="text-sm text-muted-foreground" role="status">{status}</p>
	</form>

	<section aria-labelledby="sheet-title" aria-live="polite" aria-busy={busy}>
		<div class="no-print flex items-center justify-between gap-2">
			<h2 id="sheet-title" class="text-xl font-semibold">{m.adapt_sheet_title()}</h2>
			{#if sheet && !busy}<Button variant="outline" onclick={() => window.print()}
					><PrinterIcon class="size-4" aria-hidden="true" />{m.adapt_print()}</Button
				>{/if}
		</div>
		<div class="mt-3 min-h-64 rounded-xl border border-card-ring bg-card p-6">
			{#if sheet}
				<p class="mb-4 text-lg font-semibold print:text-2xl">{data.innovation.title}</p>
				<Markdown source={sheet} />
				<p class="mt-6 text-xs text-muted-foreground">{m.adapt_disclaimer()}</p>
			{:else}
				<p class="text-muted-foreground">{m.adapt_empty()}</p>
			{/if}
		</div>
	</section>
</div>
