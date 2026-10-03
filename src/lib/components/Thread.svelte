<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { roleLabel, formatDate } from '$lib/labels';

	type Msg = {
		id: string;
		body: string;
		createdAt: Date | string;
		author: string;
		role: string;
		aiDrafted: boolean;
	};
	let { messages, action, canPost }: { messages: Msg[]; action: string; canPost: boolean } =
		$props();
	let body = $state('');
</script>

<section aria-labelledby="thread-title" class="flex flex-col gap-4">
	<h2 id="thread-title" class="text-xl font-semibold">{m.thread_title()}</h2>
	<ol class="flex flex-col gap-3" aria-live="polite">
		{#each messages as msg (msg.id)}
			<li
				class="rounded-lg border border-card-ring bg-card p-4 {msg.role === 'admin' ||
				msg.role === 'expert'
					? 'border-l-4 border-l-primary'
					: ''}"
			>
				<p class="flex flex-wrap items-center gap-2 text-sm">
					<strong>{msg.author}</strong>
					<Badge variant="outline">{roleLabel(msg.role)}</Badge>
					<time class="text-muted-foreground" datetime={new Date(msg.createdAt).toISOString()}
						>{formatDate(msg.createdAt, getLocale())}</time
					>
				</p>
				<p class="mt-2 whitespace-pre-line">{msg.body}</p>
			</li>
		{:else}
			<li class="text-muted-foreground">{m.thread_empty()}</li>
		{/each}
	</ol>
	{#if canPost}
		<form
			method="POST"
			{action}
			class="flex flex-col gap-2"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					body = '';
				}}
		>
			<Label for="thread-body">{m.thread_reply_label()}</Label>
			<Textarea id="thread-body" name="body" rows={3} bind:value={body} required maxlength={4000} />
			<div><Button type="submit">{m.thread_send()}</Button></div>
		</form>
	{/if}
</section>
