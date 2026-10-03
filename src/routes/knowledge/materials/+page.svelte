<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import * as Card from '$lib/components/ui/card';
	import EasyRead from '$lib/components/EasyRead.svelte';

	// Placeholders for ROPS materials (reports, Canvas boards, guides). Replace `href`
	// with the files ROPS provides; titles describe the content, not the file format.
	const materials = $derived([
		{ title: m.materials_canvas_title(), text: m.materials_canvas_text(), href: '#canvas' },
		{ title: m.materials_report_title(), text: m.materials_report_text(), href: '#report' },
		{ title: m.materials_guide_title(), text: m.materials_guide_text(), href: '#guide' },
		{ title: m.materials_etr_title(), text: m.materials_etr_text(), href: '#etr' }
	]);
</script>

<svelte:head><title>{m.knowledge_materials()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.knowledge_materials()}</h1>
<EasyRead key="materials.lead"><p class="text-muted-foreground mt-2 max-w-3xl text-lg">{m.materials_lead()}</p></EasyRead>

<ul class="mt-6 grid gap-4 sm:grid-cols-2">
	{#each materials as mat (mat.title)}
		<li id={mat.href.slice(1)}>
			<Card.Root class="h-full">
				<Card.Header><Card.Title><h2 class="text-lg">{mat.title}</h2></Card.Title></Card.Header>
				<Card.Content><p>{mat.text}</p></Card.Content>
			</Card.Root>
		</li>
	{/each}
</ul>
