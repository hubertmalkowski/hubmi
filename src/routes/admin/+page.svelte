<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref } from '$lib/paraglide/runtime';
	import { enhance } from '$app/forms';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner';
	import { areaLabel, needStatusLabel, formatDate } from '$lib/labels';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	let drafts = $state<Record<string, string>>({});
	let drafted = $state<Record<string, boolean>>({});
	let drafting = $state<string | null>(null);
	// the draft button needs JavaScript; keep it disabled until the page is interactive
	let ready = $state(false);
	onMount(() => (ready = true));

	async function draft(id: string) {
		drafting = id;
		try {
			const r = await fetch('/api/admin/reply', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ subject_type: 'idea', subject_id: id })
			});
			if (r.ok) {
				drafts[id] = (await r.json()).draft;
				drafted[id] = true;
			}
		} finally {
			drafting = null;
		}
	}
	const priority = (p?: number) =>
		p == null
			? '–'
			: p >= 2.5
				? m.priority_urgent()
				: p >= 1.5
					? m.priority_high()
					: p >= 0.5
						? m.priority_normal()
						: m.priority_routine();
	$effect(() => {
		if (form?.replied) toast.success(m.admin_reply_sent());
	});
</script>

<svelte:head><title>{m.admin_inbox()} | {m.app_name()}</title></svelte:head>

<h1 class="text-3xl font-bold">{m.admin_inbox()}</h1>

<Tabs.Root value="ideas" class="mt-6">
	<Tabs.List>
		<Tabs.Trigger value="ideas" class="text-foreground"
			>{m.admin_tab_ideas({ count: String(data.ideas.length) })}</Tabs.Trigger
		>
		<Tabs.Trigger value="needs" class="text-foreground">{m.admin_tab_needs()}</Tabs.Trigger>
		<Tabs.Trigger value="moderation" class="text-foreground"
			>{m.admin_tab_moderation({ count: String(data.moderation.length) })}</Tabs.Trigger
		>
	</Tabs.List>

	<Tabs.Content value="ideas" class="mt-4">
		<ul class="flex flex-col gap-4">
			{#each data.ideas as i (i.id)}
				<li>
					<Card.Root>
						<Card.Header>
							<div class="flex flex-wrap gap-2">
								<Badge>{needStatusLabel(i.status)}</Badge>
								{#if i.triage.expert}<Badge variant="secondary"
										>{m.admin_triage_area({ area: areaLabel(i.triage.expert) })}</Badge
									>{/if}
								<Badge variant="outline"
									>{m.admin_triage_priority({ priority: priority(i.triage.priority) })}</Badge
								>
							</div>
							<Card.Title
								><h2 class="text-lg">
									<a class="hover:underline" href={localizeHref(`/ideas/${i.id}`)}>{i.title}</a>
								</h2></Card.Title
							>
							<Card.Description
								>{i.author} · {formatDate(i.createdAt, getLocale())}</Card.Description
							>
						</Card.Header>
						<Card.Content>
							<p class="text-sm">{i.essence}</p>
							<form method="POST" action="?/reply" use:enhance class="mt-4 flex flex-col gap-2">
								<input type="hidden" name="idea_id" value={i.id} />
								<input type="hidden" name="ai_drafted" value={drafted[i.id] ? '1' : '0'} />
								<div class="flex items-center justify-between gap-2">
									<Label for="reply-{i.id}">{m.admin_reply_label()}</Label>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => draft(i.id)}
										disabled={!ready || drafting === i.id}
									>
										{#if drafting === i.id}<Spinner />{:else}<SparklesIcon
												class="size-4"
												aria-hidden="true"
											/>{/if}{m.admin_draft()}
									</Button>
								</div>
								<Textarea
									id="reply-{i.id}"
									name="body"
									rows={5}
									bind:value={drafts[i.id]}
									required
								/>
								<div class="flex flex-wrap items-end gap-2">
									<label class="flex flex-col gap-1 text-sm font-medium">
										{m.admin_set_status()}
										<select
											name="status"
											class="min-h-11 rounded-md border border-input bg-background px-3 text-base"
										>
											<option value="">{m.admin_keep_status()}</option>
											{#each ['in_review', 'needs_changes', 'accepted', 'testing', 'library', 'rejected'] as s (s)}<option
													value={s}>{needStatusLabel(s)}</option
												>{/each}
										</select>
									</label>
									<Button type="submit">{m.admin_send_reply()}</Button>
								</div>
							</form>
						</Card.Content>
					</Card.Root>
				</li>
			{:else}
				<li class="text-muted-foreground">{m.admin_no_ideas()}</li>
			{/each}
		</ul>
	</Tabs.Content>

	<Tabs.Content value="needs" class="mt-4">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<caption class="sr-only">{m.admin_tab_needs()}</caption>
				<thead>
					<tr class="border-b border-border">
						<th scope="col" class="py-2 pr-3">{m.admin_col_need()}</th>
						<th scope="col" class="py-2 pr-3">{m.report_area()}</th>
						<th scope="col" class="py-2 pr-3">{m.admin_col_status()}</th>
						<th scope="col" class="py-2">{m.admin_col_date()}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.recentNeeds as n (n.id)}
						<tr class="border-b border-border align-top">
							<td class="py-2 pr-3"
								><a class="hover:underline" href={localizeHref(`/report/${n.id}`)}
									>{(n.text || n.raw).slice(0, 140)}</a
								>{#if (n.urgency ?? 0) >= 2.5}
									<Badge variant="destructive">{m.priority_urgent()}</Badge>{/if}</td
							>
							<td class="py-2 pr-3">{areaLabel(n.area)}</td>
							<td class="py-2 pr-3">{needStatusLabel(n.status)}</td>
							<td class="py-2 whitespace-nowrap">{formatDate(n.createdAt, getLocale())}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if data.failedJobs.length}
			<h2 class="mt-8 text-lg font-semibold">{m.admin_failed_jobs()}</h2>
			<ul class="mt-2 text-sm">
				{#each data.failedJobs as j (j.id)}<li>
						{j.name} · {j.completed_on ? formatDate(j.completed_on, getLocale()) : ''}
					</li>{/each}
			</ul>
		{/if}
	</Tabs.Content>

	<Tabs.Content value="moderation" class="mt-4">
		<p class="text-muted-foreground">{m.admin_moderation_help()}</p>
		<ul class="mt-4 flex flex-col gap-4">
			{#each data.moderation as n (n.id)}
				<li>
					<Card.Root>
						<Card.Content class="flex flex-col gap-3 pt-6">
							<p><strong>{m.admin_original()}</strong> {n.raw}</p>
							<p><strong>{m.admin_redacted()}</strong> {n.redacted}</p>
							<div class="flex gap-2">
								<form method="POST" action="?/approveNeed" use:enhance>
									<input type="hidden" name="need_id" value={n.id} /><Button type="submit"
										>{m.admin_approve()}</Button
									>
								</form>
								<form method="POST" action="?/rejectNeed" use:enhance>
									<input type="hidden" name="need_id" value={n.id} /><Button
										type="submit"
										variant="outline">{m.admin_reject()}</Button
									>
								</form>
							</div>
						</Card.Content>
					</Card.Root>
				</li>
			{:else}
				<li class="text-muted-foreground">{m.admin_no_moderation()}</li>
			{/each}
		</ul>
	</Tabs.Content>
</Tabs.Root>
