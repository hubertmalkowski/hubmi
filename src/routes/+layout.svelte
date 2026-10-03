<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { m } from '$lib/paraglide/messages';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import A11yToolbar from '$lib/components/A11yToolbar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { setA11y } from '$lib/a11y-state.svelte';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { notificationText } from '$lib/notifications';

	let { data, children } = $props();
	const a11y = setA11y(() => data.a11y);

	// Live notifications for signed-in users: toast + refresh of the unread badge.
	onMount(() => {
		if (!data.user) return;
		const es = new EventSource('/api/notifications/stream');
		es.addEventListener('notification', (e) => {
			const { kind } = JSON.parse((e as MessageEvent).data);
			toast.info(notificationText(kind));
			invalidate('app:unread');
		});
		return () => es.close();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}: {m.app_tagline()}</title>
	<meta name="description" content={m.app_description()} />
</svelte:head>

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
>
	{m.a11y_skip_to_content()}
</a>

<SiteHeader user={data.user} unread={data.unread} />

<!-- The home page lays out its own containers so its hero can span the header width. -->
<main
	id="main"
	tabindex="-1"
	class={[
		'w-full focus:outline-none',
		page.route.id !== '/' && 'mx-auto max-w-6xl px-4 py-8 sm:px-6'
	]}
>
	{@render children()}
</main>

<footer class="no-print mt-24 border-t-4 border-primary bg-muted/60 text-muted-foreground">
	<div class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm sm:px-6">
		<A11yToolbar {a11y} />
		<hr class="my-6 border-border" />
		<p class="font-serif text-xl font-semibold text-foreground">{m.app_name()}</p>
		<p class="text-base text-foreground">{m.footer_hub()}</p>
		<p>{m.footer_demo_data()}</p>
	</div>
</footer>

<Toaster richColors closeButton position="bottom-right" />
