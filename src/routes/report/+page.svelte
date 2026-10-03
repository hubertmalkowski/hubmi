<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { Spinner } from '$lib/components/ui/spinner';
	import VoiceInput from '$lib/components/VoiceInput.svelte';
	import { areaLabel, groupLabel } from '$lib/labels';
	import { NEED_MIN, NEED_MAX } from '$lib/schemas/need';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import ShieldIcon from '@lucide/svelte/icons/shield-check';

	let { data, form } = $props();

	type Classified = {
		area: { slug: string; p: number; confidence: number };
		target_groups: { slug: string; p: number }[];
		urgent: boolean;
		is_need: number;
		pii: number;
		place: { teryt: string; name: string; powiat: string } | null;
	};

	// svelte-ignore state_referenced_locally
	let text = $state(form?.text ?? '');
	let placeTeryt = $state('');
	let classified = $state<Classified | null>(null);
	let classifying = $state(false);
	let submitting = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	const length = $derived(text.trim().length);
	const powiats = $derived([...new Set(data.places.map((p) => p.powiat))]);

	function onInput() {
		clearTimeout(timer);
		if (length < NEED_MIN) {
			classified = null;
			return;
		}
		timer = setTimeout(classify, 600);
	}

	async function classify() {
		controller?.abort();
		controller = new AbortController();
		classifying = true;
		try {
			const res = await fetch('/api/classify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text }),
				signal: controller.signal
			});
			if (res.ok) {
				classified = await res.json();
				if (classified?.place && !placeTeryt) placeTeryt = classified.place.teryt;
			}
		} catch {
			/* aborted or offline: the form still works without classification */
		} finally {
			classifying = false;
		}
	}

	function appendDictation(t: string) {
		text = text ? `${text.trimEnd()} ${t}` : t;
		onInput();
	}
</script>

<svelte:head><title>{m.report_title()} | {m.app_name()}</title></svelte:head>

<div class="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
	<section>
		<h1 class="text-3xl font-bold">{m.report_title()}</h1>
		<p class="text-muted-foreground mt-2 text-lg">{m.report_lead()}</p>

		<form
			method="POST"
			class="mt-6 flex flex-col gap-4"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<div class="flex flex-col gap-2">
				<Label for="need-text" class="text-base">{m.report_text_label()}</Label>
				<p id="need-help" class="text-muted-foreground text-sm">{m.report_text_help({ min: String(NEED_MIN) })}</p>
				<Textarea
					id="need-text"
					name="text"
					rows={8}
					required
					minlength={NEED_MIN}
					maxlength={NEED_MAX}
					bind:value={text}
					oninput={onInput}
					aria-describedby="need-help need-count{form?.tooShort ? ' need-error' : ''}"
					aria-invalid={form?.tooShort ? 'true' : undefined}
					class="min-h-48 text-lg"
					placeholder={m.report_placeholder()}
				/>
				<p id="need-count" class="text-muted-foreground text-right text-sm" aria-live="off">
					{m.report_char_count({ count: String(length), max: String(NEED_MAX) })}
				</p>
				{#if form?.tooShort}
					<p id="need-error" class="text-destructive font-medium">{m.report_too_short({ min: String(NEED_MIN) })}</p>
				{/if}
			</div>

			<VoiceInput onText={appendDictation} />

			<div class="flex flex-col gap-2">
				<Label for="place" class="text-base">{m.report_place_label()}</Label>
				<select
					id="place"
					name="place_teryt"
					bind:value={placeTeryt}
					class="border-input bg-background min-h-12 rounded-md border px-3 text-base"
				>
					<option value="">{m.report_place_unknown()}</option>
					{#each powiats as pw (pw)}
						<optgroup label={m.report_powiat({ name: pw })}>
							{#each data.places.filter((p) => p.powiat === pw) as p (p.teryt)}
								<option value={p.teryt}>{p.name}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</div>

			<p class="text-muted-foreground flex items-start gap-2 text-sm">
				<ShieldIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				{m.report_privacy()}
			</p>

			<Button type="submit" size="lg" class="h-14 text-lg" disabled={submitting || length < NEED_MIN}>
				{#if submitting}<Spinner />{/if}
				{m.report_submit()}
			</Button>
		</form>
	</section>

	<aside aria-labelledby="understood">
		<Card.Root class="sticky top-24">
			<Card.Header>
				<Card.Title><h2 id="understood" class="text-xl">{m.report_understood_title()}</h2></Card.Title>
				<Card.Description>{m.report_understood_help()}</Card.Description>
			</Card.Header>
			<Card.Content aria-live="polite" aria-busy={classifying} class="flex flex-col gap-4">
				{#if classifying && !classified}
					<p class="text-muted-foreground flex items-center gap-2"><Spinner />{m.report_classifying()}</p>
				{:else if !classified}
					<p class="text-muted-foreground">{m.report_understood_empty()}</p>
				{:else}
					{#if classified.is_need < 0.3}
						<Alert.Root>
							<Alert.Title>{m.report_not_need_title()}</Alert.Title>
							<Alert.Description>{m.report_not_need_text()}</Alert.Description>
						</Alert.Root>
					{/if}
					<div>
						<h3 class="text-muted-foreground text-sm font-semibold">{m.report_area()}</h3>
						<Badge class="mt-1 text-base">{areaLabel(classified.area.slug)}</Badge>
					</div>
					{#if classified.target_groups.length}
						<div>
							<h3 class="text-muted-foreground text-sm font-semibold">{m.report_groups()}</h3>
							<ul class="mt-1 flex flex-wrap gap-2">
								{#each classified.target_groups as g (g.slug)}
									<li><Badge variant="secondary" class="text-base">{groupLabel(g.slug)}</Badge></li>
								{/each}
							</ul>
						</div>
					{/if}
					{#if classified.place}
						<p class="flex items-center gap-2">
							<MapPinIcon class="size-4" aria-hidden="true" />
							{m.report_place_detected({ name: classified.place.name, powiat: classified.place.powiat })}
						</p>
					{/if}
					{#if classified.pii >= 0.5}
						<Alert.Root>
							<ShieldIcon aria-hidden="true" />
							<Alert.Title>{m.report_pii_title()}</Alert.Title>
							<Alert.Description>{m.report_pii_text()}</Alert.Description>
						</Alert.Root>
					{/if}
					{#if classified.urgent}
						<Alert.Root variant="destructive">
							<TriangleAlertIcon aria-hidden="true" />
							<Alert.Title>{m.report_urgent_title()}</Alert.Title>
							<Alert.Description>{m.report_urgent_text()}</Alert.Description>
						</Alert.Root>
					{/if}
					<p class="text-muted-foreground text-sm">{m.report_understood_fix()}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</aside>
</div>
