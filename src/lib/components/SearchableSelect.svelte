<script lang="ts" module>
	export type SelectOption = { value: string; label: string; group?: string };
</script>

<script lang="ts">
	// Searchable single select (shadcn combobox: Popover + Command), optionally grouped.
	// Search ignores case and Polish diacritics, so "nowy sacz" finds "Nowy Sącz".
	// A hidden input carries the value, so it works inside a plain <form>.
	import { tick, type Component } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn } from '$lib/utils';

	let {
		options,
		value = $bindable(''),
		name,
		id,
		label,
		placeholder,
		noneLabel,
		searchPlaceholder,
		emptyText,
		icon: Icon,
		onValueChange,
		class: className
	}: {
		options: SelectOption[];
		value?: string;
		/** form field name of the hidden input */
		name?: string;
		id?: string;
		/** accessible name of the control */
		label: string;
		/** trigger text when nothing is selected */
		placeholder: string;
		/** first item that clears the selection */
		noneLabel: string;
		searchPlaceholder: string;
		emptyText: string;
		icon?: Component<{ class?: string }>;
		/** called after the user picks an option (hidden input already updated) */
		onValueChange?: (value: string) => void;
		class?: string;
	} = $props();

	let open = $state(false);
	let trigger = $state<HTMLButtonElement | null>(null);

	const selected = $derived(options.find((o) => o.value === value));
	const groups = $derived([...new Set(options.map((o) => o.group))]);

	const fold = (s: string) =>
		s.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l');

	// Item values are "label group value"; every search word must appear in them.
	function filter(itemValue: string, search: string) {
		const hay = fold(itemValue);
		return fold(search)
			.split(/\s+/)
			.every((t) => hay.includes(t))
			? 1
			: 0;
	}

	async function choose(next: string) {
		value = next;
		open = false;
		await tick();
		trigger?.focus();
		onValueChange?.(next);
	}
</script>

{#if name}<input type="hidden" {name} {value} />{/if}

<Popover.Root bind:open>
	<Popover.Trigger
		bind:ref={trigger}
		{id}
		aria-label="{label}: {selected?.label ?? placeholder}"
		class={cn(
			'inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-input bg-background px-3 text-sm hover:bg-accent',
			selected ? 'font-medium text-foreground' : 'text-muted-foreground',
			className
		)}
	>
		{#if Icon}<Icon class="size-4 shrink-0 text-muted-foreground" />{/if}
		<span class="truncate">{selected?.label ?? placeholder}</span>
		<ChevronsUpDownIcon class="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
	</Popover.Trigger>
	<!-- at least as wide as the trigger -->
	<Popover.Content align="start" class="w-(--bits-popover-anchor-width) min-w-72 p-0">
		<Command.Root {filter}>
			<Command.Input placeholder={searchPlaceholder} />
			<Command.List class="max-h-72">
				<Command.Empty>{emptyText}</Command.Empty>
				<Command.Group>
					<Command.Item value="__none" onSelect={() => choose('')}>
						<span class="flex-1">{noneLabel}</span>
						{#if !value}<CheckIcon class="size-4" aria-hidden="true" />{/if}
					</Command.Item>
				</Command.Group>
				{#each groups as g (g ?? '')}
					<Command.Group heading={g}>
						{#each options.filter((o) => o.group === g) as o (o.value)}
							<Command.Item
								value="{o.label} {o.group ?? ''} {o.value}"
								onSelect={() => choose(o.value)}
							>
								<span class="flex-1">{o.label}</span>
								{#if value === o.value}<CheckIcon class="size-4" aria-hidden="true" />{/if}
							</Command.Item>
						{/each}
					</Command.Group>
				{/each}
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
