<script lang="ts">
	// Choropleth on real powiat outlines (src/lib/powiat-shapes.ts), one-hue sequential ramp.
	// The count is printed in every powiat (never colour alone); the three small city powiats
	// get a numbered badge. A ranked list and a table toggle give non-visual alternatives.
	// With `href`, every powiat is a real link (SVG <a>), so keyboard and screen readers work.
	import { m } from '$lib/paraglide/messages';
	import { POWIAT_TILES } from '$lib/powiats';
	import { POWIAT_SHAPES, MAP_SIZE } from '$lib/powiat-shapes';
	import { Button } from '$lib/components/ui/button';

	let {
		counts,
		title,
		href
	}: {
		counts: Record<string, number>;
		title: string;
		/** when set, every powiat links to this URL (shape, list and table) */
		href?: (teryt: string) => string;
	} = $props();

	let showTable = $state(false);
	/** hovered or keyboard-focused powiat, outlined on top of its neighbours */
	let active = $state<string | null>(null);
	const max = $derived(Math.max(1, ...Object.values(counts)));
	const step = (n: number) => (n <= 0 ? 0 : Math.min(7, 1 + Math.floor((n / max) * 6.999)));

	const info = new Map(POWIAT_TILES.map((p) => [p.teryt, p]));
	const label = (teryt: string) => {
		const p = info.get(teryt)!;
		return p.city ? `${p.name} (m.)` : p.name;
	};
	const tooltip = (teryt: string, n: number) =>
		m.map_tile_tooltip({ powiat: label(teryt), count: String(n) });
	const sorted = $derived(
		[...POWIAT_TILES].sort((a, b) => (counts[b.teryt] ?? 0) - (counts[a.teryt] ?? 0))
	);
	const activeShape = $derived(POWIAT_SHAPES.find((s) => s.teryt === active));
	const enter = (teryt: string) => () => (active = teryt);
	const leave = (teryt: string) => () => active === teryt && (active = null);
</script>

<figure class="w-full">
	<figcaption class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<span class="font-serif text-2xl font-semibold">{title}</span>
		<Button
			variant="outline"
			class="rounded-full"
			onclick={() => (showTable = !showTable)}
			aria-expanded={showTable}
		>
			{showTable ? m.map_show_map() : m.map_show_table()}
		</Button>
	</figcaption>

	{#if !showTable}
		<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
			<svg
				viewBox="-6 -6 {MAP_SIZE.width + 12} {MAP_SIZE.height + 12}"
				class="w-full max-w-3xl"
				role={href ? 'group' : 'img'}
				aria-label={m.map_aria({ title })}
			>
				{#each POWIAT_SHAPES as s (s.teryt)}
					{@const n = counts[s.teryt] ?? 0}
					{#snippet shape()}
						<path
							d={s.d}
							fill="var(--seq-{step(n)})"
							fill-rule="evenodd"
							stroke="var(--background)"
							stroke-width="1.5"
							stroke-linejoin="round"
							class={['transition-[filter] duration-150', s.teryt === active && 'brightness-95']}
						>
							{#if !href}<title>{tooltip(s.teryt, n)}</title>{/if}
						</path>
					{/snippet}
					{#if href}
						<a
							href={href(s.teryt)}
							aria-label={m.map_link_label({ powiat: label(s.teryt), count: String(n) })}
							class="cursor-pointer focus:outline-none"
							onpointerenter={enter(s.teryt)}
							onpointerleave={leave(s.teryt)}
							onfocus={enter(s.teryt)}
							onblur={leave(s.teryt)}
						>
							<title>{tooltip(s.teryt, n)}</title>
							{@render shape()}
						</a>
					{:else}
						{@render shape()}
					{/if}
				{/each}

				{#if activeShape}
					<!-- two-tone ring: visible on both light and dark fills -->
					{#each [{ c: 'var(--foreground)', w: 5 }, { c: 'var(--background)', w: 2 }] as ring (ring.w)}
						<path
							d={activeShape.d}
							fill="none"
							stroke={ring.c}
							stroke-width={ring.w}
							stroke-linejoin="round"
							pointer-events="none"
						/>
					{/each}
				{/if}

				<!-- Labels on top of all shapes; they never take pointer events. -->
				<g class="pointer-events-none" aria-hidden="true">
					{#each POWIAT_SHAPES as s (s.teryt)}
						{@const n = counts[s.teryt] ?? 0}
						{@const st = step(n)}
						{@const [x, y] = s.label}
						{#if info.get(s.teryt)?.city}
							<circle cx={x} cy={y} r="15" fill="var(--background)" stroke="var(--foreground)" />
							<text
								{x}
								y={y + 5}
								text-anchor="middle"
								font-size="14"
								font-weight="700"
								fill="var(--foreground)">{n}</text
							>
						{:else}
							<text
								{x}
								y={y - 3}
								text-anchor="middle"
								font-size="12"
								class="tile-ink-{st} max-sm:hidden">{label(s.teryt)}</text
							>
							<text
								{x}
								y={y + 16}
								text-anchor="middle"
								font-size="18"
								font-weight="700"
								class="tile-ink-{st} max-sm:translate-y-[-8px] max-sm:text-[32px]">{n}</text
							>
						{/if}
					{/each}
				</g>
			</svg>

			<div>
				<h3 class="text-sm font-semibold text-muted-foreground">{m.map_top_title()}</h3>
				<ol class="mt-3 flex flex-col">
					{#each sorted.slice(0, 5) as p, i (p.teryt)}
						{@const n = counts[p.teryt] ?? 0}
						<li class="border-b border-border">
							<svelte:element
								this={href ? 'a' : 'div'}
								href={href?.(p.teryt)}
								class={[
									'flex items-center gap-3 py-2.5',
									href && 'rounded-md hover:bg-accent focus-visible:bg-accent'
								]}
								onpointerenter={enter(p.teryt)}
								onpointerleave={leave(p.teryt)}
								onfocus={enter(p.teryt)}
								onblur={leave(p.teryt)}
								role={href ? undefined : 'presentation'}
							>
								<span class="w-5 text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
								<span
									class="size-3 shrink-0 rounded-sm"
									style="background: var(--seq-{step(n)})"
									aria-hidden="true"
								></span>
								<span class="flex-1">{label(p.teryt)}</span>
								<span class="font-serif text-xl font-semibold tabular-nums">{n}</span>
							</svelte:element>
						</li>
					{/each}
				</ol>

				<div class="mt-6" aria-hidden="true">
					<div class="flex h-3 overflow-hidden rounded-full">
						{#each [0, 1, 2, 3, 4, 5, 6, 7] as s (s)}
							<span class="flex-1" style="background: var(--seq-{s})"></span>
						{/each}
					</div>
					<div class="mt-1 flex justify-between text-xs text-muted-foreground">
						<span>0 · {m.map_legend_less()}</span><span>{m.map_legend_more()} · {max}</span>
					</div>
				</div>
				<p class="mt-3 text-sm text-muted-foreground">{m.map_legend({ max: String(max) })}</p>
				{#if href}<p class="mt-2 text-sm font-medium">{m.map_open_hint()}</p>{/if}
			</div>
		</div>
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
						<th scope="row" class="py-2 font-normal">
							{#if href}<a class="underline underline-offset-4" href={href(p.teryt)}
									>{label(p.teryt)}</a
								>{:else}{label(p.teryt)}{/if}
						</th>
						<td class="py-2 text-right tabular-nums">{counts[p.teryt] ?? 0}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</figure>
