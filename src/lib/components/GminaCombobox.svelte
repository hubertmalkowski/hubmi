<script lang="ts">
	// Searchable gmina picker grouped by powiat; posts the TERYT code as `name`.
	import { m } from '$lib/paraglide/messages';
	import SearchableSelect from './SearchableSelect.svelte';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	type Place = { teryt: string; name: string; powiat: string };

	let {
		places,
		value = $bindable(''),
		name = 'place_teryt',
		id,
		label,
		placeholder,
		class: className
	}: {
		places: Place[];
		value?: string;
		name?: string;
		id?: string;
		/** accessible name of the control, e.g. "Gmina (jeśli chcesz ją wskazać)" */
		label: string;
		placeholder: string;
		class?: string;
	} = $props();

	const options = $derived(
		places.map((p) => ({
			value: p.teryt,
			label: p.name,
			group: m.report_powiat({ name: p.powiat })
		}))
	);
</script>

<SearchableSelect
	{options}
	bind:value
	{name}
	{id}
	{label}
	{placeholder}
	noneLabel={m.report_place_unknown()}
	searchPlaceholder={m.gmina_search_placeholder()}
	emptyText={m.gmina_search_empty()}
	icon={MapPinIcon}
	class={className}
/>
