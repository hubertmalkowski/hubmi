import { m } from '$lib/paraglide/messages';

export function notificationText(kind: string) {
	return (
		{
			'need.matched': m.notif_need_matched,
			'need.challenge': m.notif_need_challenge,
			'need.moderation': m.notif_need_moderation,
			'need.urgent': m.notif_need_urgent,
			'idea.submitted': m.notif_idea_submitted,
			'idea.status': m.notif_idea_status,
			'message.new': m.notif_message_new,
			'application.submitted': m.notif_application_submitted
		}[kind] ?? m.notif_generic
	)();
}

export function subjectHref(type: string, id: string) {
	if (type === 'need') return `/report/${id}`;
	if (type === 'idea') return `/ideas/${id}`;
	if (type === 'challenge') return `/challenges/${id}`;
	return '/';
}
