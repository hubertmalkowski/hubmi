<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import EasyRead from '$lib/components/EasyRead.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{m.nav_tests()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.tests_title()}</h1>
<EasyRead key="tests.lead"
	><p class="mt-2 max-w-3xl text-lg text-muted-foreground">{m.tests_lead()}</p></EasyRead
>

<ul class="mt-6 grid gap-4 md:grid-cols-2">
	{#each data.campaigns as c (c.id)}
		<li>
			<Card.Root class="h-full">
				<Card.Header>
					<div class="flex flex-wrap gap-2">
						<Badge variant={c.open ? 'default' : 'secondary'}
							>{c.open ? m.tests_open() : m.tests_closed()}</Badge
						>
						<Badge variant="outline"
							>{m.tests_slots({ signed: String(c.signed), slots: String(c.slots) })}</Badge
						>
					</div>
					<Card.Title><h2 class="text-lg">{c.title}</h2></Card.Title>
					{#if c.innovation}<Card.Description>{c.innovation}</Card.Description>{/if}
				</Card.Header>
				<Card.Content><p>{c.description}</p></Card.Content>
				<Card.Footer
					><Button href={localizeHref(`/tests/${c.id}`)}>{m.tests_details()}</Button></Card.Footer
				>
			</Card.Root>
		</li>
	{:else}
		<li class="text-muted-foreground">{m.tests_empty()}</li>
	{/each}
</ul>
