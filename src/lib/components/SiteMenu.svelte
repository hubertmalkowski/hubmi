<script lang="ts">
	// Floating menu card in the style of america.gov: grows out of the Menu button's corner.
	// bits-ui Dialog handles focus trap, Escape and aria; motion.dev animates open and close.
	import { Dialog } from 'bits-ui';
	import { animate } from 'motion';
	import type { Attachment } from 'svelte/attachments';
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import XIcon from '@lucide/svelte/icons/x';
	import WheatIcon from '@lucide/svelte/icons/wheat';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { roleLabel } from '$lib/labels';
	import type { SessionUser } from '$lib/server/auth';

	let {
		links,
		current,
		user
	}: {
		links: { href: string; label: string }[];
		current: (href: string) => 'page' | undefined;
		user: SessionUser | null;
	} = $props();

	const EASE = [0.22, 1, 0.36, 1] as const;
	const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

	let open = $state(false);
	let closing = false;
	let panel: HTMLElement | undefined;
	let overlay: HTMLElement | undefined;

	// Play the exit animation before bits-ui unmounts the dialog.
	async function close() {
		if (closing || !open) return;
		if (reduced() || !panel || !overlay) {
			open = false;
			return;
		}
		closing = true;
		await Promise.all([
			animate(panel, { opacity: 0, scale: 0.92, y: -8 }, { duration: 0.2, ease: EASE }),
			animate(overlay, { opacity: 0 }, { duration: 0.2 })
		]);
		closing = false;
		open = false;
	}

	const overlayIn: Attachment<HTMLElement> = (el) => {
		overlay = el;
		if (!reduced()) animate(el, { opacity: [0, 1] }, { duration: 0.3 });
	};

	const panelIn: Attachment<HTMLElement> = (el) => {
		panel = el;
		if (reduced()) return;
		animate(
			el,
			{ opacity: [0, 1], scale: [0.6, 1], y: [-12, 0], borderRadius: ['3rem', '2rem'] },
			{ type: 'spring', bounce: 0.18, duration: 0.5 }
		);
		el.querySelectorAll<HTMLElement>('[data-menu-item]').forEach((item, i) => {
			animate(
				item,
				{ opacity: [0, 1], y: [14, 0] },
				{ duration: 0.4, delay: 0.08 + i * 0.035, ease: EASE }
			);
		});
	};
</script>

<Dialog.Root bind:open={() => open, (v) => (v ? (open = true) : close())}>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} class="size-11 rounded-full text-base sm:w-auto sm:px-5">
				<MenuIcon class="size-5" aria-hidden="true" />
				<span class="sr-only sm:not-sr-only">{m.nav_menu()}</span>
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay>
			{#snippet child({ props })}
				<div
					{...props}
					{@attach overlayIn}
					class="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
				></div>
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content>
			{#snippet child({ props })}
				<div
					{...props}
					{@attach panelIn}
					class="fixed top-3 right-3 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-md origin-top-right flex-col overflow-y-auto rounded-[2rem] bg-popover p-5 text-popover-foreground shadow-2xl sm:top-4 sm:right-4 sm:p-8"
				>
					<Dialog.Title class="sr-only">{m.nav_main()}</Dialog.Title>
					<div class="flex justify-end">
						<Dialog.Close>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									class="grid size-12 place-items-center rounded-full border-2 border-foreground hover:bg-accent"
									aria-label={m.nav_close_menu()}
								>
									<XIcon class="size-5" aria-hidden="true" />
								</button>
							{/snippet}
						</Dialog.Close>
					</div>

					{#if user}
						<section
							class="mt-4 rounded-2xl border border-card-ring p-4"
							aria-label={m.auth_signed_in_as()}
							data-menu-item
						>
							<div class="flex items-center gap-3">
								<span
									class="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-serif text-lg font-semibold text-primary-foreground"
									aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase()}</span
								>
								<div class="min-w-0 flex-1">
									<p class="text-xs text-muted-foreground">{m.auth_signed_in_as()}</p>
									<p class="font-semibold break-words">{user.displayName}</p>
									<p class="text-sm text-muted-foreground">{roleLabel(user.role)}</p>
								</div>
							</div>
							<form method="POST" action={localizeHref('/logout')} class="mt-3">
								<Button type="submit" variant="outline" class="h-11 w-full rounded-full">
									<LogOutIcon class="size-4" aria-hidden="true" />{m.auth_logout()}
								</Button>
							</form>
						</section>
					{/if}

					<nav aria-label={m.nav_main()} class="mt-4 sm:mt-6">
						<ul class="flex flex-col items-center gap-1 text-center">
							{#each [{ href: '/', label: m.nav_home() }, ...links] as l (l.href)}
								<li data-menu-item>
									<a
										href={localizeHref(l.href)}
										aria-current={l.href === '/' ? undefined : current(l.href)}
										onclick={close}
										class="inline-flex min-h-12 items-center rounded-lg px-3 font-serif text-3xl underline-offset-[6px] hover:underline aria-[current=page]:underline"
										>{l.label}</a
									>
								</li>
							{/each}
						</ul>
					</nav>

					<div
						class="mt-8 flex flex-col items-center gap-2 rounded-2xl bg-muted px-4 py-5 text-center text-sm text-muted-foreground"
						data-menu-item
					>
						<span
							class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
							aria-hidden="true"
						>
							<WheatIcon class="size-4" />
						</span>
						<p class="text-foreground">{m.footer_hub()}</p>
					</div>
				</div>
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
