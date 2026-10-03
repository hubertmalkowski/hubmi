<script lang="ts">
	// Weekly stacked bars, one categorical slot per challenge area in a fixed order
	// (colour follows the area, never its rank). 2px surface gaps between segments,
	// legend always shown, per-segment tooltip, and a table view for the same data.
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { areaLabel, AREA_SLUGS } from '$lib/labels';

	let { weekly, title }: { weekly: { week: string; byArea: Record<string, number> }[]; title: string } = $props();
	let showTable = $state(false);
	let hover = $state<{ x: number; y: number; text: string } | null>(null);

	const W = 720;
	const H = 280;
	const PAD = { l: 36, r: 8, t: 12, b: 36 };
	const totals = $derived(weekly.map((w) => Object.values(w.byArea).reduce((a, b) => a + b, 0)));
	const max = $derived(Math.max(4, ...totals));
	const niceMax = $derived(Math.ceil(max / 4) * 4);
	const bw = $derived(weekly.length ? Math.min(48, ((W - PAD.l - PAD.r) / weekly.length) * 0.62) : 0);
	const x = (i: number) => PAD.l + ((W - PAD.l - PAD.r) / Math.max(1, weekly.length)) * (i + 0.5);
	const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / niceMax);
	const fmtWeek = (w: string) => new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short' }).format(new Date(w));
	const ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f)));
	const color = (slug: string) => `var(--viz-${AREA_SLUGS.indexOf(slug as (typeof AREA_SLUGS)[number]) + 1})`;
	const presentAreas = $derived(AREA_SLUGS.filter((a) => weekly.some((w) => (w.byArea[a] ?? 0) > 0)));
</script>

<figure class="w-full">
	<figcaption class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<span class="text-lg font-semibold">{title}</span>
		<Button variant="outline" size="sm" onclick={() => (showTable = !showTable)} aria-expanded={showTable}>
			{showTable ? m.chart_show_chart() : m.map_show_table()}
		</Button>
	</figcaption>

	<ul class="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={m.chart_legend()}>
		{#each presentAreas as a (a)}
			<li class="flex items-center gap-1.5"><span class="inline-block size-3 rounded-sm" style="background: {color(a)}" aria-hidden="true"></span>{areaLabel(a)}</li>
		{/each}
	</ul>

	{#if !showTable}
		<div class="relative">
			<svg viewBox="0 0 {W} {H}" class="w-full" role="img" aria-label={m.chart_aria({ title })}>
				{#each ticks as t (t)}
					<line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" stroke-width="1" />
					<text x={PAD.l - 6} y={y(t) + 4} text-anchor="end" font-size="11" fill="var(--viz-muted)" class="tabular-nums">{t}</text>
				{/each}
				<line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke="var(--viz-axis)" stroke-width="1" />
				{#each weekly as w, i (w.week)}
					{@const segs = AREA_SLUGS.filter((a) => (w.byArea[a] ?? 0) > 0)}
					{#each segs as a, j (a)}
						{@const below = segs.slice(0, j).reduce((s, k) => s + (w.byArea[k] ?? 0), 0)}
						{@const v = w.byArea[a]}
						{@const top = j === segs.length - 1}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<path
							d={top
								? `M${x(i) - bw / 2},${y(below)} V${y(below + v) + 4} q0,-4 4,-4 H${x(i) + bw / 2 - 4} q4,0 4,4 V${y(below)} Z`
								: `M${x(i) - bw / 2},${y(below)} V${y(below + v)} H${x(i) + bw / 2} V${y(below)} Z`}
							fill={color(a)}
							stroke="var(--viz-surface)"
							stroke-width="2"
							onmouseenter={() => (hover = { x: x(i), y: y(below + v), text: `${fmtWeek(w.week)} · ${areaLabel(a)}: ${v}` })}
							onmouseleave={() => (hover = null)}
						>
							<title>{fmtWeek(w.week)} · {areaLabel(a)}: {v}</title>
						</path>
					{/each}
					<text x={x(i)} y={H - PAD.b + 16} text-anchor="middle" font-size="11" fill="var(--viz-muted)">{fmtWeek(w.week)}</text>
				{/each}
			</svg>
			{#if hover}
				<div
					class="bg-popover text-popover-foreground border-border pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border px-2 py-1 text-xs shadow"
					style="left: {(hover.x / W) * 100}%; top: {(hover.y / H) * 100}%"
					aria-hidden="true"
				>
					{hover.text}
				</div>
			{/if}
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<caption class="sr-only">{title}</caption>
				<thead>
					<tr class="border-border border-b">
						<th scope="col" class="py-2 pr-3">{m.chart_week()}</th>
						{#each presentAreas as a (a)}<th scope="col" class="py-2 pr-3">{areaLabel(a)}</th>{/each}
						<th scope="col" class="py-2">{m.chart_total()}</th>
					</tr>
				</thead>
				<tbody>
					{#each weekly as w, i (w.week)}
						<tr class="border-border border-b">
							<th scope="row" class="py-2 pr-3 font-normal">{fmtWeek(w.week)}</th>
							{#each presentAreas as a (a)}<td class="py-2 pr-3 tabular-nums">{w.byArea[a] ?? 0}</td>{/each}
							<td class="py-2 font-semibold tabular-nums">{totals[i]}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</figure>
