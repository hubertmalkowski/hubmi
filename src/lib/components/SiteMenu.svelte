<script lang="ts" module>
	export type NavLink = { href: string; label: string; desc?: string; badge?: number };
	export type NavGroup = { title: string; links: NavLink[] };
</script>

<script lang="ts">
	// Full-width drop panel under the header (gov.uk style): the Menu button discloses the
	// groups as columns. Not a modal: Escape or a click outside closes it and returns focus to
	// the button; it also closes on navigation. motion.dev animates open and close.
	import { animate } from 'motion';
	import type { Attachment } from 'svelte/attachments';
	import { afterNavigate } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import XIcon from '@lucide/svelte/icons/x';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { roleLabel } from '$lib/labels';
	import type { SessionUser } from '$lib/server/auth';

	let {
		groups,
		accountLinks,
		activeHref,
		user
	}: {
		groups: NavGroup[];
		/** personal pages, shown in the account column */
		accountLinks: NavLink[];
		/** href of the current page's link, if any */
		activeHref: string | undefined;
		user: SessionUser | null;
	} = $props();

	const EASE = [0.22, 1, 0.36, 1] as const;
	const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
	const current = (href: string) => (href === activeHref ? 'page' : undefined);

	let open = $state(false);
	let closing = false;
	let button = $state<HTMLButtonElement | null>(null);
	let panel: HTMLElement | undefined;

	async function close(refocus = false) {
		if (!open || closing) return;
		if (panel && !reduced()) {
			closing = true;
			await animate(panel, { opacity: 0, y: -8 }, { duration: 0.15, ease: EASE });
			closing = false;
		}
		open = false;
		if (refocus) button?.focus();
	}

	afterNavigate(() => close());

	const panelIn: Attachment<HTMLElement> = (el) => {
		panel = el;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true);
		const onPointer = (e: PointerEvent) => {
			const t = e.target as Node;
			if (!el.contains(t) && !button?.contains(t)) close();
		};
		document.addEventListener('keydown', onKey);
		document.addEventListener('pointerdown', onPointer);
		if (!reduced()) {
			animate(el, { opacity: [0, 1], y: [-12, 0] }, { duration: 0.3, ease: EASE });
			el.querySelectorAll<HTMLElement>('[data-menu-item]').forEach((item, i) => {
				animate(
					item,
					{ opacity: [0, 1], y: [10, 0] },
					{ duration: 0.35, delay: 0.05 + i * 0.05, ease: EASE }
				);
			});
		}
		return () => {
			document.removeEventListener('keydown', onKey);
			document.removeEventListener('pointerdown', onPointer);
		};
	};
</script>

<Button
	bind:ref={button}
	class="size-11 rounded-full text-base sm:w-auto sm:px-5"
	aria-expanded={open}
	aria-controls="site-menu"
	onclick={() => (open ? close() : (open = true))}
>
	{#if open}<XIcon class="size-5" aria-hidden="true" />{:else}<MenuIcon
			class="size-5"
			aria-hidden="true"
		/>{/if}
	<span class="sr-only sm:not-sr-only">{m.nav_menu()}</span>
</Button>

{#if open}
	<div
		id="site-menu"
		{@attach panelIn}
		class="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto border-y border-border bg-background shadow-xl"
	>
		<nav
			aria-label={m.nav_main()}
			class={[
				'mx-auto grid max-w-[110rem] gap-8 px-4 py-6 sm:px-8 sm:py-8 lg:px-12',
				user ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'
			]}
		>
			{#each groups as g, gi (g.title)}
				<section aria-labelledby="nav-group-{gi}" data-menu-item>
					<h2
						id="nav-group-{gi}"
						class="px-3 font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase"
					>
						{g.title}
					</h2>
					<ul class="mt-2 flex flex-col">
						{#each g.links as l (l.href)}
							<li>
								<a
									href={localizeHref(l.href)}
									aria-current={current(l.href)}
									class="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-accent aria-[current=page]:bg-accent"
								>
									<span class="min-w-0 flex-1">
										<span
											class="block font-serif text-lg leading-snug font-semibold group-hover:underline group-hover:underline-offset-4"
											>{l.label}</span
										>
										{#if l.desc}<span class="block text-sm text-muted-foreground">{l.desc}</span
											>{/if}
									</span>
									<ChevronRightIcon
										class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
										aria-hidden="true"
									/>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}

			{#if user}
				<section aria-labelledby="nav-group-account" data-menu-item>
					<h2
						id="nav-group-account"
						class="px-3 font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase"
					>
						{m.nav_group_account()}
					</h2>
					<div class="mt-2 flex items-center gap-3 px-3 py-2">
						<span
							class="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-serif text-lg font-semibold text-primary-foreground"
							aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase()}</span
						>
						<div class="min-w-0">
							<p class="font-semibold break-words">
								<span class="sr-only">{m.auth_signed_in_as()}: </span>{user.displayName}
							</p>
							<p class="text-sm text-muted-foreground">{roleLabel(user.role)}</p>
						</div>
					</div>
					<ul class="mt-1 flex flex-col">
						{#each accountLinks as l (l.href)}
							<li>
								<a
									href={localizeHref(l.href)}
									aria-current={current(l.href)}
									class="flex min-h-11 items-center gap-2 rounded-xl px-3 font-medium hover:bg-accent aria-[current=page]:bg-accent"
								>
									<span class="flex-1">{l.label}</span>
									{#if l.badge}
										<span
											class="min-w-6 rounded-full bg-destructive px-1.5 text-center text-xs font-bold text-white"
											>{l.badge}</span
										>
									{/if}
									<ChevronRightIcon class="size-4 text-muted-foreground" aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
					<form method="POST" action={localizeHref('/logout')} class="mt-3 px-3">
						<Button type="submit" variant="outline" class="h-11 w-full rounded-full">
							<LogOutIcon class="size-4" aria-hidden="true" />{m.auth_logout()}
						</Button>
					</form>
				</section>
			{/if}
		</nav>
	</div>
{/if}
