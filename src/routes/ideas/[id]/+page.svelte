<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import StatusTimeline from '$lib/components/StatusTimeline.svelte';
	import Thread from '$lib/components/Thread.svelte';
	import { needStatusLabel, stageLabel, formatDay } from '$lib/labels';
	import { canvasLabel, CANVAS_KEYS } from '$lib/canvas';
	import PartyPopperIcon from '@lucide/svelte/icons/party-popper';

	let { data } = $props();
	const i = $derived(data.idea);
</script>

<svelte:head><title>{i.title} | {m.app_name()}</title></svelte:head>

{#if page.url.searchParams.get('created')}
	<Alert.Root class="mb-6">
		<PartyPopperIcon aria-hidden="true" />
		<Alert.Title>{m.idea_created_title()}</Alert.Title>
		<Alert.Description>{m.idea_created_text()}</Alert.Description>
	</Alert.Root>
{/if}

<div class="grid gap-8 lg:grid-cols-[1fr_18rem]">
	<div class="flex flex-col gap-8">
		<header>
			<div class="flex flex-wrap gap-2">
				<Badge>{needStatusLabel(i.status)}</Badge><Badge variant="outline"
					>{stageLabel(i.stage)}</Badge
				>
			</div>
			<h1 class="mt-3 text-3xl font-bold">{i.title}</h1>
			<p class="mt-1 text-muted-foreground">{m.idea_by({ name: i.author })}</p>
			{#if data.challenge}
				<p class="mt-2">
					{m.idea_answers_challenge()}
					<a
						class="underline underline-offset-4"
						href={localizeHref(`/challenges/${data.challenge.id}`)}>{data.challenge.title}</a
					>
				</p>
			{/if}
		</header>

		<section aria-labelledby="fiszka" class="grid gap-4 sm:grid-cols-3">
			<h2 id="fiszka" class="sr-only">{m.idea_fiszka()}</h2>
			<Card.Root
				><Card.Header
					><Card.Title><h3 class="text-base">{m.idea_step_what()}</h3></Card.Title></Card.Header
				><Card.Content><p>{i.essence}</p></Card.Content></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Title><h3 class="text-base">{m.idea_step_who()}</h3></Card.Title></Card.Header
				><Card.Content><p>{i.forWhom}</p></Card.Content></Card.Root
			>
			<Card.Root
				><Card.Header
					><Card.Title><h3 class="text-base">{m.idea_step_how()}</h3></Card.Title></Card.Header
				><Card.Content><p>{i.howItWorks}</p></Card.Content></Card.Root
			>
		</section>

		<section aria-labelledby="canvas-title">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 id="canvas-title" class="text-xl font-semibold">{m.canvas_title()}</h2>
				{#if data.isOwner}<Button href={localizeHref(`/ideas/${i.id}/assistant`)}
						>{m.assistant_open()}</Button
					>{/if}
			</div>
			<dl class="mt-3 grid gap-3 sm:grid-cols-3">
				{#each CANVAS_KEYS as k (k)}
					<div class="rounded-lg border border-border p-3">
						<dt class="text-sm font-semibold text-muted-foreground">{canvasLabel(k)}</dt>
						<dd class="mt-1 text-sm">{i.canvas[k] ?? '–'}</dd>
					</div>
				{/each}
			</dl>
		</section>

		{#if data.canPost}
			<Thread messages={data.messages} action="?/message" canPost={data.canPost} />
		{/if}
	</div>

	<aside class="flex flex-col gap-6">
		{#if data.isOwner && data.openCalls.length}
			<Card.Root>
				<Card.Header
					><Card.Title><h2 class="text-lg">{m.calls_open_title()}</h2></Card.Title></Card.Header
				>
				<Card.Content>
					<ul class="flex flex-col gap-3">
						{#each data.openCalls as c (c.id)}
							<li>
								<p class="font-medium">{c.name}</p>
								<p class="text-sm text-muted-foreground">
									{m.calls_closes({ date: formatDay(c.closesAt, getLocale()) })}
								</p>
								<Button
									href={localizeHref(`/calls/${c.id}/apply?idea=${i.id}`)}
									size="sm"
									class="mt-2">{m.calls_apply_with_idea()}</Button
								>
							</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>
		{/if}
		<StatusTimeline events={data.timeline} />
	</aside>
</div>
