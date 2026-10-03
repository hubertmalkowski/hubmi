<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import StackedBars from '$lib/components/StackedBars.svelte';
	import { areaLabel, AREA_SLUGS } from '$lib/labels';
	import { POWIAT_TILES, POWIAT_NAME } from '$lib/powiats';

	let { data } = $props();
	const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
	const rows = $derived(
		[...POWIAT_TILES.map((p) => p.teryt), 'unknown']
			.filter((p) => data.byPowiat[p])
			.sort((a, b) => sum(data.byPowiat[b]) - sum(data.byPowiat[a]))
	);
	const cellMax = $derived(Math.max(1, ...Object.values(data.byPowiat).flatMap((r) => Object.values(r))));
	function sum(r: Record<string, number> | undefined) {
		return r ? Object.values(r).reduce((a, b) => a + b, 0) : 0;
	}
	const step = (n: number) => (n <= 0 ? 0 : Math.min(7, 1 + Math.floor((n / cellMax) * 6.999)));
</script>

<svelte:head><title>{m.admin_trends()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.admin_trends()}</h1>
<p class="text-muted-foreground mt-2">{m.trends_lead()}</p>

<dl class="mt-6 grid gap-3 sm:grid-cols-4">
	<div class="bg-card border-border rounded-xl border p-4"><dt class="text-muted-foreground text-sm">{m.trends_total()}</dt><dd class="text-3xl font-bold">{data.totals.total}</dd></div>
	<div class="bg-card border-border rounded-xl border p-4">
		<dt class="text-muted-foreground text-sm">{m.trends_matched()}</dt>
		<dd class="text-3xl font-bold">{pct(data.totals.matched, data.totals.total)}%</dd>
		<dd class="text-muted-foreground text-sm">{m.trends_of({ n: String(data.totals.matched), total: String(data.totals.total) })}</dd>
	</div>
	<div class="bg-card border-border rounded-xl border p-4">
		<dt class="text-muted-foreground text-sm">{m.trends_gaps()}</dt>
		<dd class="text-3xl font-bold">{pct(data.totals.challenge, data.totals.total)}%</dd>
		<dd class="text-muted-foreground text-sm">{m.trends_of({ n: String(data.totals.challenge), total: String(data.totals.total) })}</dd>
	</div>
	<div class="bg-card border-border rounded-xl border p-4">
		<dt class="text-muted-foreground text-sm">{m.trends_top_challenge()}</dt>
		<dd class="mt-1 font-semibold">{#if data.top}<a class="hover:underline" href={localizeHref(`/challenges/${data.top.id}`)}>{data.top.title}</a>{:else}–{/if}</dd>
	</div>
</dl>

<section class="mt-10" aria-labelledby="weekly"><h2 id="weekly" class="sr-only">{m.trends_weekly()}</h2><StackedBars weekly={data.weekly} title={m.trends_weekly()} /></section>

<section class="mt-10" aria-labelledby="heat">
	<h2 id="heat" class="text-lg font-semibold">{m.trends_heat()}</h2>
	<p class="text-muted-foreground text-sm">{m.trends_heat_help()}</p>
	<div class="mt-3 overflow-x-auto">
		<table class="text-sm">
			<caption class="sr-only">{m.trends_heat()}</caption>
			<thead>
				<tr>
					<th scope="col" class="px-2 py-2 text-left">{m.map_col_powiat()}</th>
					{#each AREA_SLUGS as a (a)}<th scope="col" class="max-w-24 px-1 py-2 text-left text-xs font-medium">{areaLabel(a)}</th>{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as p (p)}
					<tr>
						<th scope="row" class="px-2 py-1 text-left font-normal whitespace-nowrap">{p === 'unknown' ? m.trends_unknown_place() : POWIAT_NAME.get(p)}</th>
						{#each AREA_SLUGS as a (a)}
							{@const n = data.byPowiat[p]?.[a] ?? 0}
							<td class="p-0.5">
								<span class="grid h-9 min-w-12 place-items-center rounded-sm text-sm font-semibold tabular-nums" style="background: var(--seq-{step(n)})">
									<span class="tile-ink-text-{step(n)}">{n}</span>
								</span>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="mt-10" aria-labelledby="topc">
	<h2 id="topc" class="text-lg font-semibold">{m.trends_top_challenges()}</h2>
	<ol class="mt-2 list-decimal pl-5">
		{#each data.topChallenges as c (c.id)}<li><a class="underline underline-offset-4" href={localizeHref(`/challenges/${c.id}`)}>{c.title}</a> <span class="text-muted-foreground">({areaLabel(c.area_slug)}, {m.challenges_reports({ count: String(c.need_count) })})</span></li>{/each}
	</ol>
</section>
