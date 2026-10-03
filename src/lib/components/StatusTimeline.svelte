<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { needStatusLabel, formatDate } from '$lib/labels';

	let { events }: { events: { status: string; note: string | null; at: Date | string }[] } =
		$props();
</script>

<section aria-labelledby="timeline-title">
	<h2 id="timeline-title" class="text-lg font-semibold">{m.timeline_title()}</h2>
	{#if !events.length}
		<p class="mt-2 text-muted-foreground">{m.timeline_empty()}</p>
	{:else}
		<ol class="mt-3 ml-2 border-l-2 border-border">
			{#each events as e, i (i)}
				<li class="relative pb-4 pl-5">
					<span
						class="absolute top-1 -left-[9px] size-4 rounded-full border-2 border-background {i ===
						events.length - 1
							? 'bg-primary'
							: 'bg-muted-foreground'}"
						aria-hidden="true"
					></span>
					<p class="font-semibold">
						{needStatusLabel(e.status)}{#if i === events.length - 1}<span class="sr-only">
								({m.timeline_current()})</span
							>{/if}
					</p>
					<p class="text-sm text-muted-foreground">
						<time datetime={new Date(e.at).toISOString()}>{formatDate(e.at, getLocale())}</time>
					</p>
					{#if e.note}<p class="mt-1 text-sm">{e.note}</p>{/if}
				</li>
			{/each}
		</ol>
	{/if}
</section>
