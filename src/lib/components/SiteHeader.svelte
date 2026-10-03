<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import BellIcon from '@lucide/svelte/icons/bell';
	import WheatIcon from '@lucide/svelte/icons/wheat';
	import type { SessionUser } from '$lib/server/auth';

	let { user, unread }: { user: SessionUser | null; unread: number } = $props();
	let open = $state(false);

	const links = $derived([
		{ href: '/report', label: m.nav_report() },
		{ href: '/knowledge', label: m.nav_knowledge() },
		{ href: '/challenges', label: m.nav_challenges() },
		{ href: '/ideas/new', label: m.nav_ideas() },
		{ href: '/calls', label: m.nav_calls() },
		{ href: '/tests', label: m.nav_tests() },
		...(user ? [{ href: '/messages', label: m.nav_messages() }] : []),
		...(user?.role === 'admin' ? [{ href: '/admin', label: m.nav_admin() }] : [])
	]);

	const current = (href: string) => {
		const p = page.url.pathname.replace(/^\/(en|uk)(?=\/|$)/, '') || '/';
		return p === href || p.startsWith(href + '/') ? 'page' : undefined;
	};
</script>

<header class="bg-background/95 border-border no-print sticky top-0 z-40 border-b backdrop-blur">
	<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
		<a href={localizeHref('/')} class="flex items-center gap-2 rounded-md text-lg font-bold">
			<span class="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg" aria-hidden="true">
				<WheatIcon class="size-5" />
			</span>
			<span>{m.app_name()}<span class="text-muted-foreground block text-xs font-normal">{m.app_tagline()}</span></span>
		</a>

		<nav aria-label={m.nav_main()} class="hidden min-w-0 flex-1 xl:block">
			<ul class="flex flex-wrap items-center gap-1">
				{#each links as l (l.href)}
					<li>
						<a
							href={localizeHref(l.href)}
							aria-current={current(l.href)}
							class="hover:bg-accent aria-[current=page]:bg-secondary inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap aria-[current=page]:underline aria-[current=page]:underline-offset-4"
							>{l.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="ml-auto flex items-center gap-2">
			{#if user}
				<a
					href={localizeHref('/messages')}
					class="hover:bg-accent relative inline-flex size-11 items-center justify-center rounded-md"
					aria-label={m.nav_notifications({ count: String(unread) })}
				>
					<BellIcon class="size-5" aria-hidden="true" />
					{#if unread > 0}
						<span class="bg-destructive absolute top-1 right-1 min-w-5 rounded-full px-1 text-center text-xs font-bold text-white" aria-hidden="true"
							>{unread}</span
						>
					{/if}
				</a>
				<span class="hidden text-sm whitespace-nowrap 2xl:inline">{user.displayName}</span>
				<form method="POST" action={localizeHref('/logout')}>
					<Button type="submit" variant="outline" size="sm">{m.auth_logout()}</Button>
				</form>
			{:else}
				<Button href={localizeHref(`/login?next=${encodeURIComponent(page.url.pathname)}`)} variant="outline" size="sm">{m.auth_login()}</Button>
			{/if}

			<Sheet.Root bind:open>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="icon" class="size-11 xl:hidden" aria-label={m.nav_open_menu()}>
							<MenuIcon class="size-6" aria-hidden="true" />
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content side="right">
					<Sheet.Header><Sheet.Title>{m.nav_main()}</Sheet.Title></Sheet.Header>
					<nav aria-label={m.nav_main()} class="px-4">
						<ul class="flex flex-col gap-1">
							{#each links as l (l.href)}
								<li>
									<a
										href={localizeHref(l.href)}
										aria-current={current(l.href)}
										onclick={() => (open = false)}
										class="hover:bg-accent aria-[current=page]:bg-secondary flex min-h-12 items-center rounded-md px-3 text-base font-medium"
										>{l.label}</a
									>
								</li>
							{/each}
						</ul>
					</nav>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
</header>
