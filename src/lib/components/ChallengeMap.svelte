<script lang="ts">
	// Schematic choropleth: one tile per powiat, one-hue sequential ramp, the count is
	// printed in every tile (never colour alone), plus a sortable table alternative.
	import { m } from '$lib/paraglide/messages';
	import { POWIAT_TILES } from '$lib/powiats';
	import { Button } from '$lib/components/ui/button';

	let {
		counts,
		title,
		selected = $bindable<string | null>(null),
		interactive = false
	}: {
		counts: Record<string, number>;
		title: string;
		selected?: string | null;
		interactive?: boolean;
	} = $props();

	let showTable = $state(false);
	const max = $derived(Math.max(1, ...Object.values(counts)));
	const step = (n: number) => (n <= 0 ? 0 : Math.min(7, 1 + Math.floor((n / max) * 6.999)));

	const W = 104;
	const H = 64;
	const GAP = 4;
	const cols = 7;
	const rows = 6;
	const tooltip = (name: string, n: number) =>
		m.map_tile_tooltip({ powiat: name, count: String(n) });
	const sorted = $derived(
		[...POWIAT_TILES].sort((a, b) => (counts[b.teryt] ?? 0) - (counts[a.teryt] ?? 0))
	);
</script>

<figure class="w-full">
	<figcaption class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<span class="text-lg font-semibold">{title}</span>
		<Button
			variant="outline"
			size="sm"
			onclick={() => (showTable = !showTable)}
			aria-expanded={showTable}
		>
			{showTable ? m.map_show_map() : m.map_show_table()}
		</Button>
	</figcaption>

	{#if !showTable}
		<svg
			viewBox="0 0 {cols * (W + GAP)} {rows * (H + GAP)}"
			class="w-full max-w-3xl"
			role={interactive ? 'group' : 'img'}
			aria-label={m.map_aria({ title })}
			style="background: transparent"
		>
			{#each POWIAT_TILES as p (p.teryt)}
				{@const n = counts[p.teryt] ?? 0}
				{@const s = step(n)}
				{@const x = p.col * (W + GAP)}
				{@const y = p.row * (H + GAP)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<g
					role={interactive ? 'button' : undefined}
					tabindex={interactive ? 0 : undefined}
					aria-label={interactive ? tooltip(p.name, n) : undefined}
					aria-pressed={interactive ? selected === p.teryt : undefined}
					class={interactive
						? 'cursor-pointer focus:outline-none [&:focus-visible>rect]:stroke-[var(--ring)] [&:focus-visible>rect]:stroke-[4]'
						: ''}
					onclick={() => interactive && (selected = selected === p.teryt ? null : p.teryt)}
					onkeydown={(e) => {
						if (interactive && (e.key === 'Enter' || e.key === ' ')) {
							e.preventDefault();
							selected = selected === p.teryt ? null : p.teryt;
						}
					}}
				>
					<title>{tooltip(p.name, n)}</title>
					<rect
						{x}
						{y}
						width={W}
						height={H}
						rx="6"
						fill="var(--seq-{s})"
						stroke={selected === p.teryt ? 'var(--foreground)' : 'var(--viz-surface)'}
						stroke-width={selected === p.teryt ? 3 : 2}
					/>
					<text x={x + 8} y={y + 22} font-size="12" class="tile-ink-{s}"
						>{p.city ? `${p.name} (m.)` : p.name}</text
					>
					<text x={x + 8} y={y + 50} font-size="20" font-weight="700" class="tile-ink-{s}">{n}</text
					>
				</g>
			{/each}
		</svg>
		<p class="mt-2 text-sm text-muted-foreground">{m.map_legend({ max: String(max) })}</p>
	{:else}
		<table class="w-full max-w-xl text-left text-sm">
			<caption class="sr-only">{title}</caption>
			<thead>
				<tr class="border-b border-border">
					<th scope="col" class="py-2">{m.map_col_powiat()}</th>
					<th scope="col" class="py-2 text-right">{m.map_col_count()}</th>
				</tr>
			</thead>
			<tbody>
				{#each sorted as p (p.teryt)}
					<tr class="border-b border-border">
						<th scope="row" class="py-2 font-normal">{p.name}</th>
						<td class="py-2 text-right tabular-nums">{counts[p.teryt] ?? 0}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</figure>
