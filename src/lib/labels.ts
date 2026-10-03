// Enum → translated label helpers, so templates never show raw slugs.
import { m } from '$lib/paraglide/messages';

export function roleLabel(role: string) {
	return (
		{
			resident: m.role_resident,
			ngo: m.role_ngo,
			jst: m.role_jst,
			expert: m.role_expert,
			admin: m.role_admin
		}[role] ?? (() => role)
	)();
}

export function moderationReasonLabel(reason: string) {
	return (
		{
			pii: m.moderation_reason_pii,
			abuse: m.moderation_reason_abuse,
			not_need: m.moderation_reason_not_need
		}[reason] ?? (() => reason)
	)();
}

export function stageLabel(stage: string) {
	return (
		{
			idea: m.stage_idea,
			prototype: m.stage_prototype,
			tested: m.stage_tested,
			implemented: m.stage_implemented,
			micro_tested: m.stage_micro_tested
		}[stage] ?? (() => stage)
	)();
}

export function needStatusLabel(status: string) {
	return (
		{
			new: m.status_new,
			processing: m.status_processing,
			matched: m.status_matched,
			challenge: m.status_challenge,
			moderation: m.status_moderation,
			closed: m.status_closed,
			submitted: m.status_submitted,
			in_review: m.status_in_review,
			needs_changes: m.status_needs_changes,
			accepted: m.status_accepted,
			testing: m.status_testing,
			library: m.status_library,
			rejected: m.status_rejected,
			draft: m.status_draft
		}[status] ?? (() => status)
	)();
}

export function fitText(label: 'direct' | 'good' | 'partial' | 'weak') {
	return { direct: m.fit_direct, good: m.fit_good, partial: m.fit_partial, weak: m.fit_weak }[
		label
	]();
}

export function feedbackCategoryLabel(c: string | null) {
	if (!c) return m.feedback_cat_pending();
	return (
		{
			bug: m.feedback_cat_bug,
			usability: m.feedback_cat_usability,
			accessibility: m.feedback_cat_accessibility,
			idea: m.feedback_cat_idea,
			praise: m.feedback_cat_praise,
			other: m.feedback_cat_other
		}[c] ?? (() => c)
	)();
}

export function formatDate(d: Date | string, locale: string) {
	return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-GB' : 'pl-PL', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(d));
}

export function formatDay(d: Date | string, locale: string) {
	return new Intl.DateTimeFormat(locale === 'uk' ? 'uk-UA' : locale === 'en' ? 'en-GB' : 'pl-PL', {
		dateStyle: 'long'
	}).format(new Date(d));
}

export function areaLabel(slug: string | null | undefined) {
	if (!slug) return m.area_other();
	return (
		{
			aging: m.area_aging,
			mental_health: m.area_mental_health,
			loneliness: m.area_loneliness,
			digital_exclusion: m.area_digital_exclusion,
			service_access: m.area_service_access,
			coordination: m.area_coordination,
			depopulation: m.area_depopulation,
			other: m.area_other
		}[slug] ?? (() => slug)
	)();
}

export function groupLabel(slug: string) {
	return (
		{
			seniors: m.group_seniors,
			disabled: m.group_disabled,
			youth: m.group_youth,
			children: m.group_children,
			families: m.group_families,
			caregivers: m.group_caregivers,
			migrants: m.group_migrants,
			unemployed: m.group_unemployed,
			rural_residents: m.group_rural_residents,
			homeless: m.group_homeless
		}[slug] ?? (() => slug)
	)();
}

export const AREA_SLUGS = [
	'aging',
	'mental_health',
	'loneliness',
	'digital_exclusion',
	'service_access',
	'coordination',
	'depopulation',
	'other'
] as const;
export const GROUP_SLUGS = [
	'seniors',
	'disabled',
	'youth',
	'children',
	'families',
	'caregivers',
	'migrants',
	'unemployed',
	'rural_residents',
	'homeless'
] as const;
