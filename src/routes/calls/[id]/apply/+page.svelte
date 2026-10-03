<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Alert from '$lib/components/ui/alert';
	import { formatDay } from '$lib/labels';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';

	let { data, form } = $props();
	// svelte-ignore state_referenced_locally
	let ideaId = $state(data.selectedIdea ?? '');
	// svelte-ignore state_referenced_locally
	let answers = $state<Record<string, string>>((form?.answers as Record<string, string>) ?? {});
	let filling = $state(false);
	let status = $state('');

	async function prefill() {
		if (!ideaId) return;
		filling = true;
		status = m.apply_filling();
		try {
			const r = await fetch(`/api/calls/${data.call.id}/applications`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ idea_id: ideaId })
			});
			if (!r.ok) throw new Error();
			answers = (await r.json()).answers;
			status = m.apply_filled();
		} catch {
			status = m.apply_fill_error();
		} finally {
			filling = false;
		}
	}
	const missing = (k: string) => (form?.missing as string[] | undefined)?.includes(k);
</script>

<svelte:head><title>{m.apply_title()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.apply_title()}</h1>
<p class="mt-2 text-lg font-medium">{data.call.name}</p>
<p class="text-muted-foreground">{m.calls_closes({ date: formatDay(data.call.closesAt, getLocale()) })}</p>

{#if !data.ideas.length}
	<Alert.Root class="mt-6"><Alert.Title>{m.apply_no_ideas()}</Alert.Title></Alert.Root>
{:else}
	<form method="POST" class="mt-6 flex max-w-3xl flex-col gap-5">
		<div class="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
			<Label for="idea_id">{m.apply_choose_idea()}</Label>
			<select id="idea_id" name="idea_id" bind:value={ideaId} class="border-input bg-background min-h-11 rounded-md border px-3 text-base">
				{#each data.ideas as i (i.id)}<option value={i.id}>{i.title}</option>{/each}
			</select>
			<div class="flex flex-wrap items-center gap-3">
				<Button type="button" variant="secondary" onclick={prefill} disabled={filling || !ideaId}>
					{#if filling}<Spinner />{:else}<SparklesIcon class="size-4" aria-hidden="true" />{/if}
					{m.apply_prefill()}
				</Button>
				<span class="text-muted-foreground text-sm" role="status">{status}</span>
			</div>
			<p class="text-muted-foreground text-sm">{m.apply_prefill_note()}</p>
		</div>

		{#if form?.missing}<p class="text-destructive font-medium" role="alert">{m.apply_missing()}</p>{/if}

		{#each data.call.fields as f (f.key)}
			<div class="flex flex-col gap-2">
				<Label for="f_{f.key}">{f.label_pl}</Label>
				{#if f.help_pl}<p id="h_{f.key}" class="text-muted-foreground text-sm">{f.help_pl}</p>{/if}
				{#if f.type === 'textarea'}
					<Textarea id="f_{f.key}" name="f_{f.key}" rows={5} maxlength={f.max_length} bind:value={answers[f.key]} required aria-invalid={missing(f.key) ? 'true' : undefined} aria-describedby={f.help_pl ? `h_${f.key}` : undefined} />
				{:else if f.type === 'select'}
					<select id="f_{f.key}" name="f_{f.key}" bind:value={answers[f.key]} required class="border-input bg-background min-h-11 rounded-md border px-3 text-base">
						<option value="">–</option>
						{#each f.options ?? [] as o (o)}<option value={o}>{o}</option>{/each}
					</select>
				{:else}
					<Input id="f_{f.key}" name="f_{f.key}" type={f.type === 'number' ? 'number' : 'text'} maxlength={f.max_length} bind:value={answers[f.key]} required class="min-h-11 text-base" />
				{/if}
				{#if f.max_length}<p class="text-muted-foreground text-right text-xs">{(answers[f.key] ?? '').length}/{f.max_length}</p>{/if}
			</div>
		{/each}
		<div><Button type="submit" size="lg">{m.apply_submit()}</Button></div>
	</form>
{/if}
