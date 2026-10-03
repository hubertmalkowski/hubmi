<script lang="ts">
	// Searchable gmina picker (shadcn combobox: Popover + Command), grouped by powiat.
	// Search ignores case and Polish diacritics, so "nowy sacz" finds "Nowy Sącz".
	// A hidden input carries the TERYT code, so it works inside a plain <form>.
	import { tick } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn } from '$lib/utils';

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

	let open = $state(false);
	let trigger = $state<HTMLButtonElement | null>(null);

	const selected = $derived(places.find((p) => p.teryt === value));
	const powiats = $derived([...new Set(places.map((p) => p.powiat))]);

	const fold = (s: string) =>
		s.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');

	// Item values are "name powiat teryt"; every search word must appear in them.
	function filter(itemValue: string, search: string) {
		const hay = fold(itemValue);
		return fold(search)
			.split(/\s+/)
			.every((t) => hay.includes(t))
			? 1
			: 0;
	}

	async function choose(teryt: string) {
		value = teryt;
		open = false;
		await tick();
		trigger?.focus();
	}
</script>

<input type="hidden" {name} {value} />

<Popover.Root bind:open>
	<Popover.Trigger
		bind:ref={trigger}
		{id}
		aria-label="{label}: {selected?.name ?? placeholder}"
		class={cn(
			'inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-input bg-background pr-3 pl-3 text-sm hover:bg-accent',
			selected ? 'font-medium text-foreground' : 'text-muted-foreground',
			className
		)}
	>
		<MapPinIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
		<span class="truncate">{selected?.name ?? placeholder}</span>
		<ChevronsUpDownIcon class="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
	</Popover.Trigger>
	<!-- at least as wide as the trigger (full-width on /report) -->
	<Popover.Content align="start" class="w-(--bits-popover-anchor-width) min-w-72 p-0">
		<Command.Root {filter}>
			<Command.Input placeholder={m.gmina_search_placeholder()} />
			<Command.List class="max-h-72">
				<Command.Empty>{m.gmina_search_empty()}</Command.Empty>
				<Command.Group>
					<Command.Item value="__none" onSelect={() => choose('')}>
						<span class="flex-1">{m.report_place_unknown()}</span>
						{#if !value}<CheckIcon class="size-4" aria-hidden="true" />{/if}
					</Command.Item>
				</Command.Group>
				{#each powiats as pw (pw)}
					<Command.Group heading={m.report_powiat({ name: pw })}>
						{#each places.filter((p) => p.powiat === pw) as p (p.teryt)}
							<Command.Item value="{p.name} {p.powiat} {p.teryt}" onSelect={() => choose(p.teryt)}>
								<span class="flex-1">{p.name}</span>
								{#if value === p.teryt}<CheckIcon class="size-4" aria-hidden="true" />{/if}
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
