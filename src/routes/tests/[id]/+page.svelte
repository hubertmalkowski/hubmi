<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import EmojiScale from '$lib/components/EmojiScale.svelte';
	import { feedbackCategoryLabel } from '$lib/labels';

	let { data, form } = $props();
	let rating = $state(0);
	const avg = $derived(data.feedback.length ? data.feedback.reduce((s, f) => s + f.rating, 0) / data.feedback.length : 0);
</script>

<svelte:head><title>{data.campaign.title} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{data.campaign.title}</h1>
{#if data.innovation}
	<p class="mt-1">{m.tests_innovation()} <a class="underline underline-offset-4" href={localizeHref(`/knowledge/library/${data.innovation.slug}`)}>{data.innovation.title}</a></p>
{/if}
<p class="mt-4 max-w-3xl text-lg">{data.campaign.description}</p>
<p class="text-muted-foreground mt-2">{m.tests_slots({ signed: String(data.signedCount), slots: String(data.campaign.slots) })}</p>

<div class="mt-6 grid gap-8 lg:grid-cols-2">
	<section aria-labelledby="join" class="flex flex-col gap-4">
		<h2 id="join" class="text-xl font-semibold">{m.tests_join_title()}</h2>
		{#if form?.full}<Alert.Root><Alert.Title>{m.tests_full()}</Alert.Title></Alert.Root>{/if}
		{#if data.isSigned || form?.signedUp}
			<p class="bg-secondary rounded-lg p-3" role="status">{m.tests_signed()}</p>
		{:else if data.campaign.open}
			<form method="POST" action="?/signup" use:enhance><Button type="submit" size="lg">{m.tests_signup()}</Button></form>
		{/if}

		{#if data.isSigned || form?.signedUp}
			<h2 class="mt-4 text-xl font-semibold">{m.tests_feedback_title()}</h2>
			{#if form?.thanks}
				<p class="bg-secondary rounded-lg p-3" role="status">{m.tests_thanks()}</p>
			{:else}
				<form method="POST" action="?/feedback" use:enhance class="flex flex-col gap-4">
					<EmojiScale bind:value={rating} />
					<div class="flex flex-col gap-2">
						<Label for="fb-text">{m.tests_feedback_text()}</Label>
						<Textarea id="fb-text" name="text" rows={4} maxlength={2000} />
					</div>
					<div><Button type="submit" disabled={!rating}>{m.tests_feedback_send()}</Button></div>
				</form>
			{/if}
		{/if}
	</section>

	{#if data.staff}
		<section aria-labelledby="results">
			<h2 id="results" class="text-xl font-semibold">{m.tests_results_title()}</h2>
			<p class="mt-1">{m.tests_results_avg({ avg: avg.toFixed(1), count: String(data.feedback.length) })}</p>
			<form method="POST" action="?/summarize" use:enhance class="mt-3"><Button type="submit" variant="secondary">{m.tests_summarize()}</Button></form>
			{#if form?.summary}
				<Card.Root class="mt-4">
					<Card.Header><Card.Title><h3 class="text-base">{m.tests_summary_title()}</h3></Card.Title></Card.Header>
					<Card.Content>
						<ol class="list-decimal pl-5">
							{#each form.summary as s, i (i)}<li>{s.text} <span class="text-muted-foreground">({m.tests_raised_by({ count: String(s.count) })})</span></li>{:else}<li>{m.tests_no_feedback()}</li>{/each}
						</ol>
					</Card.Content>
				</Card.Root>
			{/if}
			<ul class="mt-4 flex flex-col gap-2">
				{#each data.feedback as f (f.id)}
					<li class="border-border rounded-lg border p-3">
						<p class="flex flex-wrap items-center gap-2 text-sm"><strong>{f.author}</strong> · {f.rating}/5 <Badge variant="outline">{feedbackCategoryLabel(f.category)}</Badge></p>
						{#if f.text}<p class="mt-1">{f.text}</p>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
