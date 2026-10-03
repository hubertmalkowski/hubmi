<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import { formatDay } from '$lib/labels';

	let { data, form } = $props();
	const now = Date.now();
	const v = (k: string) => (form?.values as Record<string, string> | undefined)?.[k] ?? '';
</script>

<svelte:head><title>{m.admin_calls()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.admin_calls()}</h1>

<ul class="mt-6 flex flex-col gap-2">
	{#each data.calls as c (c.id)}
		{@const open = c.opensAt.getTime() <= now && c.closesAt.getTime() > now}
		<li class="border-border flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
			<span class="font-medium">{c.name}</span>
			<span class="flex items-center gap-2 text-sm">
				{formatDay(c.opensAt, getLocale())} – {formatDay(c.closesAt, getLocale())}
				<Badge variant={open ? 'default' : 'secondary'}>{open ? m.tests_open() : m.tests_closed()}</Badge>
			</span>
		</li>
	{/each}
</ul>

<h2 class="mt-10 text-xl font-semibold">{m.admin_new_call()}</h2>
{#if form?.created}<Alert.Root class="mt-3"><Alert.Title>{m.admin_saved()}</Alert.Title></Alert.Root>{/if}
{#if form?.schemaError}<p class="text-destructive mt-3 font-medium" role="alert">{m.admin_call_error({ detail: String(form.schemaError) })}</p>{/if}
<form method="POST" action="?/create" use:enhance class="mt-4 grid max-w-3xl gap-4">
	<div class="flex flex-col gap-2"><Label for="name">{m.admin_call_name()}</Label><Input id="name" name="name" required value={v('name')} class="min-h-11" /></div>
	<div class="flex flex-col gap-2"><Label for="description">{m.admin_description()}</Label><Textarea id="description" name="description" rows={3} required value={v('description')} /></div>
	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-2"><Label for="opens_at">{m.admin_opens()}</Label><Input id="opens_at" name="opens_at" type="date" required value={v('opens_at')} class="min-h-11" /></div>
		<div class="flex flex-col gap-2"><Label for="closes_at">{m.admin_closes()}</Label><Input id="closes_at" name="closes_at" type="date" required value={v('closes_at')} class="min-h-11" /></div>
	</div>
	<div class="flex flex-col gap-2">
		<Label for="form_schema">{m.admin_form_schema()}</Label>
		<p id="schema-help" class="text-muted-foreground text-sm">{m.admin_form_schema_help()}</p>
		<Textarea id="form_schema" name="form_schema" rows={12} class="font-mono text-sm" aria-describedby="schema-help" value={v('form_schema') || data.defaultSchema} />
	</div>
	<div><Button type="submit">{m.admin_save()}</Button></div>
</form>
