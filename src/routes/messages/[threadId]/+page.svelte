<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import Thread from '$lib/components/Thread.svelte';
	import { subjectHref } from '$lib/notifications';

	let { data } = $props();
</script>

<svelte:head><title>{data.thread.title} | {m.app_name()}</title></svelte:head>

<nav aria-label={m.breadcrumb()} class="text-muted-foreground text-sm">
	<a class="underline underline-offset-4" href={localizeHref('/messages')}>{m.nav_messages()}</a> / <span aria-current="page">{data.thread.title}</span>
</nav>
<h1 class="mt-3 text-3xl font-bold">{data.thread.title}</h1>
<p class="mt-1"><a class="underline underline-offset-4" href={localizeHref(subjectHref(data.thread.subjectType, data.thread.subjectId))}>{m.messages_open_subject()}</a></p>
<div class="mt-6 max-w-3xl"><Thread messages={data.messages} action="" canPost={true} /></div>
