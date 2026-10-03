<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { roleLabel } from '$lib/labels';

	let { data } = $props();
</script>

<svelte:head><title>{m.auth_login()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.auth_login_title()}</h1>
<p class="text-muted-foreground mt-2 max-w-2xl">{m.auth_login_demo_note()}</p>

<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.demo as u (u.id)}
		<li>
			<Card.Root class="h-full">
				<Card.Header>
					<Card.Title><h2 class="text-lg">{u.displayName}</h2></Card.Title>
					<Card.Description>{roleLabel(u.role)}</Card.Description>
				</Card.Header>
				<Card.Footer>
					<form method="POST">
						<input type="hidden" name="userId" value={u.id} />
						<input type="hidden" name="next" value={data.next} />
						<Button type="submit" size="lg">{m.auth_login_as({ name: u.displayName })}</Button>
					</form>
				</Card.Footer>
			</Card.Root>
		</li>
	{/each}
</ul>
