<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner';
	import { canvasLabel, CANVAS_KEYS } from '$lib/canvas';

	let { data } = $props();
	type Msg = { role: 'user' | 'assistant'; content: string };
	let messages = $state<Msg[]>([]);
	let input = $state('');
	let busy = $state(false);
	let status = $state('');

	const starters = $derived([
		m.assistant_starter_1(),
		m.assistant_starter_2(),
		m.assistant_starter_3()
	]);

	async function send(text: string) {
		if (!text.trim() || busy) return;
		messages = [
			...messages,
			{ role: 'user', content: text.trim() },
			{ role: 'assistant', content: '' }
		];
		input = '';
		busy = true;
		status = m.assistant_thinking();
		try {
			const res = await fetch(`/api/ideas/${data.idea.id}/assistant`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messages: messages.slice(0, -1) })
			});
			if (!res.ok || !res.body) throw new Error(String(res.status));
			const reader = res.body.getReader();
			const dec = new TextDecoder();
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				messages[messages.length - 1].content += dec.decode(value, { stream: true });
			}
			status = m.assistant_done();
			await invalidateAll();
		} catch {
			messages[messages.length - 1].content = m.assistant_error();
			status = m.assistant_error();
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>{m.assistant_title()} | {m.app_name()}</title></svelte:head>

<nav aria-label={m.breadcrumb()} class="text-sm text-muted-foreground">
	<a class="underline underline-offset-4" href={localizeHref(`/ideas/${data.idea.id}`)}
		>{data.idea.title}</a
	>
	/ <span aria-current="page">{m.assistant_title()}</span>
</nav>
<h1 class="mt-3 text-3xl font-bold">{m.assistant_title()}</h1>
<p class="mt-2 max-w-3xl text-muted-foreground">{m.assistant_lead()}</p>

<div class="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
	<section aria-labelledby="chat-title" class="flex flex-col gap-4">
		<h2 id="chat-title" class="sr-only">{m.assistant_chat()}</h2>
		<ol class="flex flex-col gap-3" aria-live="polite" aria-relevant="additions text">
			{#each messages as msg, i (i)}
				<li
					class="max-w-[85%] rounded-xl p-4 whitespace-pre-line {msg.role === 'user'
						? 'self-end bg-primary text-primary-foreground'
						: 'border border-border bg-card'}"
				>
					<span class="sr-only"
						>{msg.role === 'user' ? m.assistant_you() : m.assistant_name()}:</span
					>
					{msg.content}{#if busy && i === messages.length - 1 && !msg.content}<Spinner />{/if}
				</li>
			{:else}
				<li class="text-muted-foreground">{m.assistant_empty()}</li>
			{/each}
		</ol>
		{#if !messages.length}
			<div class="flex flex-wrap gap-2">
				{#each starters as s (s)}<Button variant="outline" onclick={() => send(s)}>{s}</Button
					>{/each}
			</div>
		{/if}
		<form
			class="flex flex-col gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				send(input);
			}}
		>
			<Label for="msg">{m.assistant_input_label()}</Label>
			<Textarea
				id="msg"
				rows={3}
				bind:value={input}
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						send(input);
					}
				}}
			/>
			<div class="flex items-center gap-3">
				<Button type="submit" disabled={busy || !input.trim()}>{m.thread_send()}</Button>
				<span class="text-sm text-muted-foreground" role="status">{status}</span>
			</div>
		</form>
	</section>
	<aside aria-labelledby="canvas-side">
		<h2 id="canvas-side" class="text-lg font-semibold">{m.canvas_title()}</h2>
		<p class="text-sm text-muted-foreground">{m.assistant_canvas_help()}</p>
		<dl class="mt-3 flex flex-col gap-2">
			{#each CANVAS_KEYS as k (k)}
				<div class="rounded-lg border border-border p-3">
					<dt class="text-xs font-semibold text-muted-foreground uppercase">{canvasLabel(k)}</dt>
					<dd class="mt-1 text-sm">{data.idea.canvas[k] ?? '–'}</dd>
				</div>
			{/each}
		</dl>
	</aside>
</div>
