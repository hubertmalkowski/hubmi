<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { areaLabel, groupLabel, stageLabel, AREA_SLUGS, GROUP_SLUGS } from '$lib/labels';

	let { data, form } = $props();
	const v = $derived((form?.values as Record<string, unknown> | undefined) ?? {});
	const i = $derived(data.innovation);
	const val = (k: string, fallback: unknown) => String(v[k] ?? fallback ?? '');
	const groups = $derived((v.target_groups as string[] | undefined) ?? i?.targetGroups ?? []);
	const errs = $derived((form?.errors as Record<string, string[]> | undefined) ?? {});
	const sel = 'border-input bg-background min-h-11 rounded-md border px-3 text-base';
</script>

<svelte:head><title>{i ? i.title : m.admin_add_innovation()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{i ? m.admin_edit_innovation() : m.admin_add_innovation()}</h1>
{#if page.url.searchParams.get('saved')}<Alert.Root class="mt-4"
		><Alert.Title>{m.admin_saved()}</Alert.Title></Alert.Root
	>{/if}
{#if form?.slugTaken}<Alert.Root variant="destructive" class="mt-4"
		><Alert.Title>{m.admin_slug_taken()}</Alert.Title></Alert.Root
	>{/if}
{#if Object.keys(errs).length}<p class="mt-4 font-medium text-destructive" role="alert">
		{m.admin_form_errors({ fields: Object.keys(errs).join(', ') })}
	</p>{/if}

<form method="POST" class="mt-6 grid max-w-3xl gap-4">
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-2">
			<Label for="title">{m.admin_col_title()}</Label><Input
				id="title"
				name="title"
				value={val('title', i?.title)}
				required
				class="min-h-11"
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="slug">{m.admin_slug()}</Label><Input
				id="slug"
				name="slug"
				value={val('slug', i?.slug)}
				required
				pattern="[a-z0-9-]{'{3,80}'}"
				class="min-h-11"
			/>
		</div>
	</div>
	<div class="flex flex-col gap-2">
		<Label for="summary">{m.admin_summary()}</Label><Textarea
			id="summary"
			name="summary"
			rows={2}
			maxlength={300}
			value={val('summary', i?.summary)}
			required
		/>
	</div>
	<div class="flex flex-col gap-2">
		<Label for="description">{m.admin_description()}</Label><Textarea
			id="description"
			name="description"
			rows={6}
			value={val('description', i?.description)}
			required
		/>
	</div>
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="flex flex-col gap-2">
			<Label for="area_slug">{m.report_area()}</Label>
			<select id="area_slug" name="area_slug" class={sel} value={val('area_slug', i?.areaSlug)}
				>{#each AREA_SLUGS as a (a)}<option value={a}>{areaLabel(a)}</option>{/each}</select
			>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="stage">{m.library_filter_stage()}</Label>
			<select id="stage" name="stage" class={sel} value={val('stage', i?.stage ?? 'tested')}
				>{#each ['idea', 'prototype', 'tested', 'implemented'] as s (s)}<option value={s}
						>{stageLabel(s)}</option
					>{/each}</select
			>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="status">{m.admin_col_status()}</Label>
			<select id="status" name="status" class={sel} value={val('status', i?.status ?? 'draft')}>
				<option value="draft">{m.status_draft()}</option>
				<option value="published">{m.admin_published()}</option>
			</select>
		</div>
	</div>
	<fieldset>
		<legend class="text-sm font-medium">{m.library_filter_group()}</legend>
		<div class="mt-2 grid gap-2 sm:grid-cols-2">
			{#each GROUP_SLUGS as g (g)}
				<label class="flex min-h-11 items-center gap-2"
					><input
						type="checkbox"
						name="target_groups"
						value={g}
						checked={groups.includes(g)}
						class="size-5"
					/>{groupLabel(g)}</label
				>
			{/each}
		</div>
	</fieldset>
	<div class="flex flex-col gap-2">
		<Label for="video_url">{m.admin_video()}</Label><Input
			id="video_url"
			name="video_url"
			type="url"
			value={val('video_url', i?.videoUrl)}
			class="min-h-11"
		/>
	</div>
	<div class="flex flex-col gap-2">
		<Label for="implementation_notes">{m.innovation_implementation()}</Label><Textarea
			id="implementation_notes"
			name="implementation_notes"
			rows={3}
			value={val('implementation_notes', i?.implementationNotes)}
		/>
	</div>
	<div class="flex flex-col gap-2">
		<Label for="cost_hint">{m.innovation_cost()}</Label><Input
			id="cost_hint"
			name="cost_hint"
			value={val('cost_hint', i?.costHint)}
			class="min-h-11"
		/>
	</div>
	<p class="text-sm text-muted-foreground">{m.admin_reindex_note()}</p>
	<div><Button type="submit" size="lg">{m.admin_save()}</Button></div>
</form>
