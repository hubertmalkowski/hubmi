<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { Badge } from '$lib/components/ui/badge';
	import { formatDate } from '$lib/labels';
	import { notificationText, subjectHref } from '$lib/notifications';

	let { data } = $props();
</script>

<svelte:head><title>{m.nav_messages()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.messages_title()}</h1>

<div class="mt-6 grid gap-8 lg:grid-cols-2">
	<section aria-labelledby="notifs">
		<h2 id="notifs" class="text-xl font-semibold">{m.messages_notifications()}</h2>
		<ul class="mt-3 flex flex-col gap-2">
			{#each data.notifications as n (n.id)}
				<li
					class="flex items-start justify-between gap-3 rounded-lg border border-border p-3 {n.unread
						? 'bg-secondary'
						: ''}"
				>
					<div>
						<a
							class="font-medium underline underline-offset-4"
							href={localizeHref(subjectHref(n.subjectType, n.subjectId))}
							>{notificationText(n.kind)}</a
						>
						<p class="text-sm text-muted-foreground">{formatDate(n.createdAt, getLocale())}</p>
					</div>
					{#if n.unread}<Badge>{m.messages_new()}</Badge>{/if}
				</li>
			{:else}
				<li class="text-muted-foreground">{m.messages_no_notifications()}</li>
			{/each}
		</ul>
	</section>
	<section aria-labelledby="threads">
		<h2 id="threads" class="text-xl font-semibold">{m.messages_threads()}</h2>
		<ul class="mt-3 flex flex-col gap-2">
			{#each data.threads as t (t.id)}
				<li class="rounded-lg border border-border p-3">
					<a
						class="font-medium underline underline-offset-4"
						href={localizeHref(`/messages/${t.id}`)}>{t.title}</a
					>
					<p class="text-sm text-muted-foreground">
						{m.messages_count({ count: String(t.count) })}{#if t.last}
							· {formatDate(t.last, getLocale())}{/if}
					</p>
				</li>
			{:else}
				<li class="text-muted-foreground">{m.messages_no_threads()}</li>
			{/each}
		</ul>
	</section>
</div>
