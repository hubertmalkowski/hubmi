<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import BellIcon from '@lucide/svelte/icons/bell';
	import WheatIcon from '@lucide/svelte/icons/wheat';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import SiteMenu from '$lib/components/SiteMenu.svelte';
	import type { SessionUser } from '$lib/server/auth';

	let { user, unread }: { user: SessionUser | null; unread: number } = $props();

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

	const current = (href: string): 'page' | undefined => {
		const p = page.url.pathname.replace(/^\/(en|uk)(?=\/|$)/, '') || '/';
		return p === href || p.startsWith(href + '/') ? 'page' : undefined;
	};
</script>

<header class="no-print bg-background">
	<div
		class="mx-auto flex max-w-[110rem] items-center gap-2 px-4 py-4 sm:gap-4 sm:px-8 lg:px-12 lg:py-5"
	>
		<a href={localizeHref('/')} class="flex items-center gap-3 rounded-lg">
			<span
				class="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"
				aria-hidden="true"
			>
				<WheatIcon class="size-5" />
			</span>
			<span class="font-serif text-2xl leading-none font-semibold tracking-tight"
				>{m.app_name()}<span class="sr-only">: {m.app_tagline()}</span></span
			>
		</a>

		<div class="ml-auto flex items-center gap-1 sm:gap-2">
			<LanguageSwitcher />
			{#if user}
				<a
					href={localizeHref('/messages')}
					class="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-accent"
					aria-label={m.nav_notifications({ count: String(unread) })}
				>
					<BellIcon class="size-5" aria-hidden="true" />
					{#if unread > 0}
						<span
							class="absolute top-1 right-1 min-w-5 rounded-full bg-destructive px-1 text-center text-xs font-bold text-white"
							aria-hidden="true">{unread}</span
						>
					{/if}
				</a>
				<span class="hidden text-sm whitespace-nowrap lg:inline">{user.displayName}</span>
			{:else}
				<Button
					href={localizeHref(`/login?next=${encodeURIComponent(page.url.pathname)}`)}
					variant="ghost"
					class="h-11 rounded-full px-3 sm:px-4">{m.auth_login()}</Button
				>
			{/if}

			<SiteMenu {links} {current} {user} />
		</div>
	</div>
</header>
