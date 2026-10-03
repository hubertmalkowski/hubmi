<script lang="ts">
	// Five large radio buttons with emoji and text, so the rating never depends on the icon alone.
	import { m } from '$lib/paraglide/messages';
	let { name = 'rating', value = $bindable(0) }: { name?: string; value?: number } = $props();
	const options = $derived([
		{ v: 1, e: '😞', label: m.rating_1() },
		{ v: 2, e: '🙁', label: m.rating_2() },
		{ v: 3, e: '😐', label: m.rating_3() },
		{ v: 4, e: '🙂', label: m.rating_4() },
		{ v: 5, e: '😄', label: m.rating_5() }
	]);
</script>

<fieldset>
	<legend class="text-base font-semibold">{m.rating_legend()}</legend>
	<div class="mt-2 grid grid-cols-5 gap-2">
		{#each options as o (o.v)}
			<label
				class="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-border p-2 text-center has-checked:border-primary has-checked:bg-secondary has-focus-visible:outline-3 has-focus-visible:outline-ring"
			>
				<input type="radio" {name} value={o.v} bind:group={value} required class="sr-only" />
				<span class="text-3xl" aria-hidden="true">{o.e}</span>
				<span class="text-xs sm:text-sm">{o.label}</span>
			</label>
		{/each}
	</div>
</fieldset>
