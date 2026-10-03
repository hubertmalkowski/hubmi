import {
	pgTable,
	pgEnum,
	text,
	uuid,
	timestamp,
	integer,
	real,
	boolean,
	jsonb,
	smallint,
	primaryKey,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
	timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date());

export const roleEnum = pgEnum('role', ['resident', 'ngo', 'jst', 'expert', 'admin']);
export const localeEnum = pgEnum('locale', ['pl', 'en', 'uk']);
export const orgKindEnum = pgEnum('org_kind', ['ngo', 'jst', 'cus', 'gops', 'pcpr', 'other']);
export const placeKindEnum = pgEnum('place_kind', ['urban', 'rural', 'urban_rural']);
export const innovationStageEnum = pgEnum('innovation_stage', [
	'idea',
	'prototype',
	'tested',
	'implemented'
]);
export const publishStatusEnum = pgEnum('publish_status', ['draft', 'published']);
export const needStatusEnum = pgEnum('need_status', [
	'new',
	'processing',
	'matched',
	'challenge',
	'moderation',
	'closed'
]);
export const ideaStageEnum = pgEnum('idea_stage', ['idea', 'prototype', 'micro_tested']);
export const ideaStatusEnum = pgEnum('idea_status', [
	'draft',
	'submitted',
	'in_review',
	'needs_changes',
	'accepted',
	'testing',
	'library',
	'rejected'
]);
export const applicationStatusEnum = pgEnum('application_status', ['draft', 'submitted']);
export const feedbackCategoryEnum = pgEnum('feedback_category', [
	'bug',
	'usability',
	'accessibility',
	'idea',
	'praise',
	'other'
]);
export const subjectTypeEnum = pgEnum('subject_type', [
	'need',
	'idea',
	'innovation',
	'challenge',
	'application'
]);

export const organizations = pgTable('organizations', {
	id: id(),
	name: text('name').notNull(),
	kind: orgKindEnum('kind').notNull(),
	placeTeryt: text('place_teryt'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const users = pgTable('users', {
	id: id(),
	displayName: text('display_name').notNull(),
	role: roleEnum('role').notNull(),
	orgId: uuid('org_id').references(() => organizations.id),
	expertTags: text('expert_tags').array().notNull().default([]),
	locale: localeEnum('locale').notNull().default('pl'),
	email: text('email'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: createdAt()
});

export const places = pgTable('places', {
	teryt: text('teryt').primaryKey(),
	name: text('name').notNull(),
	kind: placeKindEnum('kind').notNull(),
	powiat: text('powiat').notNull(),
	powiatTeryt: text('powiat_teryt').notNull(),
	population: integer('population').notNull().default(0),
	aliases: text('aliases').array().notNull().default([])
});

export const challengeAreas = pgTable('challenge_areas', {
	slug: text('slug').primaryKey(),
	namePl: text('name_pl').notNull(),
	descriptionPl: text('description_pl').notNull(),
	descriptionEn: text('description_en').notNull(),
	mapStats: jsonb('map_stats').$type<Record<string, number>>().notNull().default({})
});

export const targetGroups = pgTable('target_groups', {
	slug: text('slug').primaryKey(),
	namePl: text('name_pl').notNull(),
	descriptionEn: text('description_en').notNull()
});

export const innovations = pgTable(
	'innovations',
	{
		id: id(),
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		summary: text('summary').notNull(),
		description: text('description').notNull(),
		areaSlug: text('area_slug')
			.notNull()
			.references(() => challengeAreas.slug),
		targetGroups: text('target_groups').array().notNull().default([]),
		stage: innovationStageEnum('stage').notNull().default('tested'),
		videoUrl: text('video_url'),
		imageUrl: text('image_url'),
		implementationNotes: text('implementation_notes').notNull().default(''),
		costHint: text('cost_hint').notNull().default(''),
		contactOrgId: uuid('contact_org_id').references(() => organizations.id),
		status: publishStatusEnum('status').notNull().default('published'),
		embedding: real('embedding').array(),
		embeddingModel: text('embedding_model'),
		contentHash: text('content_hash'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('innovations_slug_idx').on(t.slug)]
);

export const challenges = pgTable('challenges', {
	id: id(),
	title: text('title').notNull(),
	description: text('description').notNull(),
	areaSlug: text('area_slug')
		.notNull()
		.references(() => challengeAreas.slug),
	open: boolean('open').notNull().default(true),
	needCount: integer('need_count').notNull().default(0),
	placeTeryts: text('place_teryts').array().notNull().default([]),
	embedding: real('embedding').array(),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const needs = pgTable(
	'needs',
	{
		id: id(),
		rawText: text('raw_text').notNull(),
		redactedText: text('redacted_text').notNull().default(''),
		locale: localeEnum('locale').notNull().default('pl'),
		normalizedPl: text('normalized_pl'),
		authorId: uuid('author_id').references(() => users.id),
		areaSlug: text('area_slug').references(() => challengeAreas.slug),
		areaConfidence: real('area_confidence'),
		targetGroups: text('target_groups').array().notNull().default([]),
		placeTeryt: text('place_teryt').references(() => places.teryt),
		urgency: real('urgency'),
		piiFlag: boolean('pii_flag').notNull().default(false),
		/** why the need was held for review: 'pii' | 'abuse' | 'not_need' */
		moderationReasons: text('moderation_reasons').array().notNull().default([]),
		/** set when ROPS approves a held need; the abuse/not-a-need gates are skipped afterwards */
		moderationApprovedAt: timestamp('moderation_approved_at', { withTimezone: true }),
		embedding: real('embedding').array(),
		status: needStatusEnum('status').notNull().default('new'),
		challengeId: uuid('challenge_id').references(() => challenges.id),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('needs_area_place_created_idx').on(t.areaSlug, t.placeTeryt, t.createdAt),
		index('needs_status_idx').on(t.status)
	]
);

export type Highlights = Partial<Record<'title' | 'summary' | 'description', string[]>>;

export const matches = pgTable(
	'matches',
	{
		id: id(),
		needId: uuid('need_id')
			.notNull()
			.references(() => needs.id, { onDelete: 'cascade' }),
		innovationId: uuid('innovation_id')
			.notNull()
			.references(() => innovations.id, { onDelete: 'cascade' }),
		bm25Rank: integer('bm25_rank'),
		knnRank: integer('knn_rank'),
		rrfRank: integer('rrf_rank').notNull(),
		jevScore: real('jev_score'),
		pGood: real('p_good'),
		confidence: real('confidence'),
		kept: boolean('kept').notNull().default(false),
		reason: text('reason'),
		highlights: jsonb('highlights').$type<Highlights>().notNull().default({}),
		acceptedAt: timestamp('accepted_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('matches_need_innovation_idx').on(t.needId, t.innovationId),
		index('matches_need_idx').on(t.needId)
	]
);

export type Canvas = Partial<
	Record<
		| 'problem'
		| 'beneficiaries'
		| 'solution'
		| 'value'
		| 'partners'
		| 'resources'
		| 'costs'
		| 'risks'
		| 'measures',
		string
	>
>;

export const ideas = pgTable('ideas', {
	id: id(),
	title: text('title').notNull(),
	essence: text('essence').notNull(),
	forWhom: text('for_whom').notNull(),
	howItWorks: text('how_it_works').notNull().default(''),
	stage: ideaStageEnum('stage').notNull().default('idea'),
	challengeId: uuid('challenge_id').references(() => challenges.id),
	authorId: uuid('author_id')
		.notNull()
		.references(() => users.id),
	status: ideaStatusEnum('status').notNull().default('submitted'),
	canvas: jsonb('canvas').$type<Canvas>().notNull().default({}),
	completeness: jsonb('completeness').$type<Record<string, number>>().notNull().default({}),
	triage: jsonb('triage')
		.$type<{ expert?: string; expertConfidence?: number; priority?: number }>()
		.notNull()
		.default({}),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export type FormField = {
	key: string;
	label_pl: string;
	help_pl?: string;
	type: 'text' | 'textarea' | 'number' | 'select';
	max_length?: number;
	options?: string[];
};

export const calls = pgTable('calls', {
	id: id(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
	closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
	formSchema: jsonb('form_schema').$type<FormField[]>().notNull().default([]),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const applications = pgTable('applications', {
	id: id(),
	ideaId: uuid('idea_id')
		.notNull()
		.references(() => ideas.id, { onDelete: 'cascade' }),
	callId: uuid('call_id')
		.notNull()
		.references(() => calls.id, { onDelete: 'cascade' }),
	answers: jsonb('answers').$type<Record<string, string>>().notNull().default({}),
	status: applicationStatusEnum('status').notNull().default('draft'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const testCampaigns = pgTable('test_campaigns', {
	id: id(),
	innovationId: uuid('innovation_id').references(() => innovations.id, { onDelete: 'cascade' }),
	ideaId: uuid('idea_id').references(() => ideas.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description').notNull(),
	slots: integer('slots').notNull().default(20),
	open: boolean('open').notNull().default(true),
	createdAt: createdAt()
});

export const testSignups = pgTable(
	'test_signups',
	{
		campaignId: uuid('campaign_id')
			.notNull()
			.references(() => testCampaigns.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.campaignId, t.userId] })]
);

export const feedback = pgTable('feedback', {
	id: id(),
	campaignId: uuid('campaign_id')
		.notNull()
		.references(() => testCampaigns.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id),
	rating: smallint('rating').notNull(),
	text: text('text'),
	category: feedbackCategoryEnum('category'),
	categoryP: real('category_p'),
	actionableP: real('actionable_p'),
	createdAt: createdAt()
});

export const threads = pgTable(
	'threads',
	{
		id: id(),
		subjectType: subjectTypeEnum('subject_type').notNull(),
		subjectId: uuid('subject_id').notNull(),
		title: text('title').notNull(),
		assignedExpertId: uuid('assigned_expert_id').references(() => users.id),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('threads_subject_idx').on(t.subjectType, t.subjectId)]
);

export const messages = pgTable(
	'messages',
	{
		id: id(),
		threadId: uuid('thread_id')
			.notNull()
			.references(() => threads.id, { onDelete: 'cascade' }),
		authorId: uuid('author_id')
			.notNull()
			.references(() => users.id),
		body: text('body').notNull(),
		aiDrafted: boolean('ai_drafted').notNull().default(false),
		createdAt: createdAt()
	},
	(t) => [index('messages_thread_idx').on(t.threadId, t.createdAt)]
);

export const statusEvents = pgTable(
	'status_events',
	{
		id: id(),
		subjectType: subjectTypeEnum('subject_type').notNull(),
		subjectId: uuid('subject_id').notNull(),
		status: text('status').notNull(),
		note: text('note'),
		actorId: uuid('actor_id').references(() => users.id),
		createdAt: createdAt()
	},
	(t) => [index('status_events_subject_idx').on(t.subjectType, t.subjectId, t.createdAt)]
);

export const notifications = pgTable(
	'notifications',
	{
		id: id(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind').notNull(),
		subjectType: subjectTypeEnum('subject_type').notNull(),
		subjectId: uuid('subject_id').notNull(),
		readAt: timestamp('read_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('notifications_user_read_idx').on(t.userId, t.readAt)]
);

export const translations = pgTable(
	'translations',
	{
		entity: text('entity').notNull(),
		entityId: text('entity_id').notNull(),
		field: text('field').notNull(),
		locale: localeEnum('locale').notNull(),
		contentHash: text('content_hash').notNull(),
		text: text('text').notNull(),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.entity, t.entityId, t.field, t.locale, t.contentHash] })]
);

export const aiCache = pgTable(
	'ai_cache',
	{
		kind: text('kind').notNull(),
		keyHash: text('key_hash').notNull(),
		value: jsonb('value').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.kind, t.keyHash] })]
);

export const rateLimits = pgTable(
	'rate_limits',
	{
		key: text('key').notNull(),
		bucket: text('bucket').notNull(),
		tokens: real('tokens').notNull(),
		refilledAt: timestamp('refilled_at', { withTimezone: true }).notNull()
	},
	(t) => [primaryKey({ columns: [t.key, t.bucket] })]
);

export const auditAi = pgTable(
	'audit_ai',
	{
		id: id(),
		kind: text('kind').notNull(),
		provider: text('provider').notNull(),
		model: text('model').notNull(),
		inputTokens: integer('input_tokens').notNull().default(0),
		outputTokens: integer('output_tokens').notNull().default(0),
		latencyMs: integer('latency_ms').notNull().default(0),
		requestId: text('request_id'),
		createdAt: createdAt()
	},
	(t) => [index('audit_ai_created_idx').on(t.createdAt)]
);
