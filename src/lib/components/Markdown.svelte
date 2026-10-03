<script lang="ts">
	import { parseMarkdown, type Inline } from '$lib/markdown';
	let { source }: { source: string } = $props();
	const blocks = $derived(parseMarkdown(source));
</script>

{#snippet text(parts: Inline[])}{#each parts as p, i (i)}{#if p.bold}<strong>{p.text}</strong>{:else}{p.text}{/if}{/each}{/snippet}

<div class="prose prose-neutral dark:prose-invert max-w-none">
	{#each blocks as b, i (i)}
		{#if b.type === 'h'}
			{#if b.level === 2}<h2>{b.text}</h2>{:else}<h3>{b.text}</h3>{/if}
		{:else if b.type === 'p'}
			<p>{@render text(b.parts)}</p>
		{:else if b.type === 'ol'}
			<ol>{#each b.items as it, j (j)}<li>{@render text(it)}</li>{/each}</ol>
		{:else}
			<ul>{#each b.items as it, j (j)}<li>{@render text(it)}</li>{/each}</ul>
		{/if}
	{/each}
</div>
