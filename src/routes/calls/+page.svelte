<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { formatDay } from '$lib/labels';

	let { data } = $props();
</script>

<svelte:head><title>{m.nav_calls()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.calls_title()}</h1>
<p class="mt-2 max-w-3xl text-lg text-muted-foreground">{m.calls_lead()}</p>

<section class="mt-8" aria-labelledby="open">
	<h2 id="open" class="text-2xl font-semibold">{m.calls_open_title()}</h2>
	{#if !data.open.length}<p class="mt-2">{m.calls_none_open()}</p>{/if}
	<ul class="mt-4 grid gap-4 md:grid-cols-2">
		{#each data.open as c (c.id)}
			<li>
				<Card.Root class="h-full">
					<Card.Header>
						<Card.Title><h3 class="text-lg">{c.name}</h3></Card.Title>
						<Card.Description
							>{m.calls_closes({ date: formatDay(c.closesAt, getLocale()) })}</Card.Description
						>
					</Card.Header>
					<Card.Content><p>{c.description}</p></Card.Content>
					<Card.Footer
						><Button href={localizeHref(`/calls/${c.id}/apply`)}>{m.calls_apply()}</Button
						></Card.Footer
					>
				</Card.Root>
			</li>
		{/each}
	</ul>
</section>

{#if data.closed.length}
	<section class="mt-10" aria-labelledby="closed">
		<h2 id="closed" class="text-xl font-semibold">{m.calls_closed_title()}</h2>
		<ul class="mt-3 flex flex-col gap-2">
			{#each data.closed as c (c.id)}
				<li class="text-muted-foreground">
					{c.name} ({m.calls_closed_on({ date: formatDay(c.closesAt, getLocale()) })})
				</li>
			{/each}
		</ul>
	</section>
{/if}
