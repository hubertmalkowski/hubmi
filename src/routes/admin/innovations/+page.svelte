<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { areaLabel, stageLabel, needStatusLabel, formatDate } from '$lib/labels';

	let { data } = $props();
</script>

<svelte:head><title>{m.admin_innovations()} | {m.app_name()}</title></svelte:head>

<div class="flex flex-wrap items-center justify-between gap-4">
	<h1 class="text-3xl font-bold">{m.admin_innovations()}</h1>
	<Button href={localizeHref('/admin/innovations/new')}>{m.admin_add_innovation()}</Button>
</div>

<div class="mt-6 overflow-x-auto">
	<table class="w-full text-left text-sm">
		<caption class="sr-only">{m.admin_innovations()}</caption>
		<thead>
			<tr class="border-b border-border">
				<th scope="col" class="py-2 pr-3">{m.admin_col_title()}</th>
				<th scope="col" class="py-2 pr-3">{m.report_area()}</th>
				<th scope="col" class="py-2 pr-3">{m.library_filter_stage()}</th>
				<th scope="col" class="py-2 pr-3">{m.admin_col_status()}</th>
				<th scope="col" class="py-2">{m.admin_col_updated()}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.innovations as i (i.id)}
				<tr class="border-b border-border">
					<td class="py-2 pr-3"
						><a
							class="font-medium hover:underline"
							href={localizeHref(`/admin/innovations/${i.id}`)}>{i.title}</a
						></td
					>
					<td class="py-2 pr-3">{areaLabel(i.areaSlug)}</td>
					<td class="py-2 pr-3">{stageLabel(i.stage)}</td>
					<td class="py-2 pr-3"
						><Badge variant={i.status === 'published' ? 'default' : 'secondary'}
							>{i.status === 'published' ? m.admin_published() : needStatusLabel('draft')}</Badge
						></td
					>
					<td class="py-2 whitespace-nowrap">{formatDate(i.updatedAt, getLocale())}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
