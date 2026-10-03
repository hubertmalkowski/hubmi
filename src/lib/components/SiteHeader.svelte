<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import BellIcon from '@lucide/svelte/icons/bell';
	import WheatIcon from '@lucide/svelte/icons/wheat';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import SiteMenu, { type NavGroup, type NavLink } from '$lib/components/SiteMenu.svelte';
	import type { SessionUser } from '$lib/server/auth';

	let { user, unread }: { user: SessionUser | null; unread: number } = $props();

	// Menu grouped by what people come to do; each item says what is behind it.
	const groups = $derived<NavGroup[]>([
		{
			title: m.nav_group_problem(),
			links: [
				{ href: '/report', label: m.nav_report(), desc: m.nav_report_desc() },
				{ href: '/knowledge/library', label: m.nav_library(), desc: m.nav_library_desc() },
				{ href: '/tests', label: m.nav_tests(), desc: m.nav_tests_desc() }
			]
		},
		{
			title: m.nav_group_idea(),
			links: [
				{ href: '/challenges', label: m.nav_challenges(), desc: m.nav_challenges_desc() },
				{ href: '/ideas/new', label: m.nav_ideas(), desc: m.nav_ideas_desc() },
				{ href: '/calls', label: m.nav_calls(), desc: m.nav_calls_desc() }
			]
		},
		{
			title: m.nav_group_region(),
			links: [
				{ href: '/knowledge', label: m.nav_knowledge(), desc: m.nav_knowledge_desc() },
				{ href: '/knowledge/materials', label: m.nav_materials(), desc: m.nav_materials_desc() }
			]
		}
	]);
	const accountLinks = $derived<NavLink[]>(
		user
			? [
					{ href: '/messages', label: m.nav_messages(), badge: unread || undefined },
					{ href: '/ideas', label: m.nav_my_ideas() },
					...(user.role === 'admin' ? [{ href: '/admin', label: m.nav_admin() }] : [])
				]
			: []
	);

	// The most specific matching link is current, so /knowledge/library marks
	// "Sprawdzone rozwiązania" and not "Mapa potrzeb i dane".
	const activeHref = $derived.by(() => {
		const path = page.url.pathname.replace(/^\/(en|uk)(?=\/|$)/, '') || '/';
		const hrefs = [...groups.flatMap((g) => g.links), ...accountLinks].map((l) => l.href);
		return hrefs
			.filter((h) => path === h || path.startsWith(h + '/'))
			.sort((x, y) => y.length - x.length)[0];
	});
</script>

<header class="no-print relative z-40 bg-background">
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

			<SiteMenu {groups} {accountLinks} {activeHref} {user} />
		</div>
	</div>
</header>
