<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';

	let { children } = $props();
	const links = $derived([
		{ href: '/admin', label: m.admin_inbox() },
		{ href: '/admin/innovations', label: m.admin_innovations() },
		{ href: '/admin/calls', label: m.admin_calls() },
		{ href: '/admin/trends', label: m.admin_trends() }
	]);
	const path = $derived(page.url.pathname.replace(/^\/(en|uk)(?=\/)/, ''));
</script>

<nav aria-label={m.admin_nav()} class="mb-6 border-b border-border">
	<ul class="flex flex-wrap gap-1">
		{#each links as l (l.href)}
			{@const active = l.href === '/admin' ? path === '/admin' : path.startsWith(l.href)}
			<li>
				<a
					href={localizeHref(l.href)}
					aria-current={active ? 'page' : undefined}
					class="inline-flex min-h-11 items-center border-b-2 border-transparent px-4 font-medium aria-[current=page]:border-primary aria-[current=page]:font-bold"
					>{l.label}</a
				>
			</li>
		{/each}
	</ul>
</nav>
{@render children()}
