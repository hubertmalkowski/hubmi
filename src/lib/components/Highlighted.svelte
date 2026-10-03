<script lang="ts">
	// Renders an Elasticsearch highlight fragment ("…<mark>senior</mark>…") without
	// {@html}: the string is split on the mark tags and every part is rendered as text.
	let { fragment }: { fragment: string } = $props();
	const parts = $derived(
		fragment.split(/(<mark>.*?<\/mark>)/g).map((p) =>
			p.startsWith('<mark>') ? { mark: true, text: p.slice(6, -7) } : { mark: false, text: p }
		)
	);
</script>

{#each parts as p, i (i)}{#if p.mark}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}
