CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."feedback_category" AS ENUM('bug', 'usability', 'accessibility', 'idea', 'praise', 'other');--> statement-breakpoint
CREATE TYPE "public"."idea_stage" AS ENUM('idea', 'prototype', 'micro_tested');--> statement-breakpoint
CREATE TYPE "public"."idea_status" AS ENUM('draft', 'submitted', 'in_review', 'needs_changes', 'accepted', 'testing', 'library', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."innovation_stage" AS ENUM('idea', 'prototype', 'tested', 'implemented');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('pl', 'en', 'uk');--> statement-breakpoint
CREATE TYPE "public"."need_status" AS ENUM('new', 'processing', 'matched', 'challenge', 'moderation', 'closed');--> statement-breakpoint
CREATE TYPE "public"."org_kind" AS ENUM('ngo', 'jst', 'cus', 'gops', 'pcpr', 'other');--> statement-breakpoint
CREATE TYPE "public"."place_kind" AS ENUM('urban', 'rural', 'urban_rural');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('resident', 'ngo', 'jst', 'expert', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subject_type" AS ENUM('need', 'idea', 'innovation', 'challenge', 'application');--> statement-breakpoint
CREATE TABLE "ai_cache" (
	"kind" text NOT NULL,
	"key_hash" text NOT NULL,
	"value" jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_cache_kind_key_hash_pk" PRIMARY KEY("kind","key_hash")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"call_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_ai" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"form_schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_areas" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_pl" text NOT NULL,
	"description_pl" text NOT NULL,
	"description_en" text NOT NULL,
	"map_stats" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"area_slug" text NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"need_count" integer DEFAULT 0 NOT NULL,
	"place_teryts" text[] DEFAULT '{}' NOT NULL,
	"embedding" real[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"text" text,
	"category" "feedback_category",
	"category_p" real,
	"actionable_p" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"essence" text NOT NULL,
	"for_whom" text NOT NULL,
	"how_it_works" text DEFAULT '' NOT NULL,
	"stage" "idea_stage" DEFAULT 'idea' NOT NULL,
	"challenge_id" uuid,
	"author_id" uuid NOT NULL,
	"status" "idea_status" DEFAULT 'submitted' NOT NULL,
	"canvas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completeness" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"triage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "innovations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"area_slug" text NOT NULL,
	"target_groups" text[] DEFAULT '{}' NOT NULL,
	"stage" "innovation_stage" DEFAULT 'tested' NOT NULL,
	"video_url" text,
	"image_url" text,
	"implementation_notes" text DEFAULT '' NOT NULL,
	"cost_hint" text DEFAULT '' NOT NULL,
	"contact_org_id" uuid,
	"status" "publish_status" DEFAULT 'published' NOT NULL,
	"embedding" real[],
	"embedding_model" text,
	"content_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"need_id" uuid NOT NULL,
	"innovation_id" uuid NOT NULL,
	"bm25_rank" integer,
	"knn_rank" integer,
	"rrf_rank" integer NOT NULL,
	"jev_score" real,
	"p_good" real,
	"confidence" real,
	"kept" boolean DEFAULT false NOT NULL,
	"reason" text,
	"highlights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"ai_drafted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "needs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_text" text NOT NULL,
	"redacted_text" text DEFAULT '' NOT NULL,
	"locale" "locale" DEFAULT 'pl' NOT NULL,
	"normalized_pl" text,
	"author_id" uuid,
	"area_slug" text,
	"area_confidence" real,
	"target_groups" text[] DEFAULT '{}' NOT NULL,
	"place_teryt" text,
	"urgency" real,
	"pii_flag" boolean DEFAULT false NOT NULL,
	"embedding" real[],
	"status" "need_status" DEFAULT 'new' NOT NULL,
	"challenge_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"subject_type" "subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "org_kind" NOT NULL,
	"place_teryt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"teryt" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "place_kind" NOT NULL,
	"powiat" text NOT NULL,
	"powiat_teryt" text NOT NULL,
	"population" integer DEFAULT 0 NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"bucket" text NOT NULL,
	"tokens" real NOT NULL,
	"refilled_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_limits_key_bucket_pk" PRIMARY KEY("key","bucket")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" "subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "target_groups" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_pl" text NOT NULL,
	"description_en" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"innovation_id" uuid,
	"idea_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"slots" integer DEFAULT 20 NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_signups" (
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_signups_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" "subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assigned_expert_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"field" text NOT NULL,
	"locale" "locale" NOT NULL,
	"content_hash" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_entity_entity_id_field_locale_content_hash_pk" PRIMARY KEY("entity","entity_id","field","locale","content_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"role" "role" NOT NULL,
	"org_id" uuid,
	"expert_tags" text[] DEFAULT '{}' NOT NULL,
	"locale" "locale" DEFAULT 'pl' NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_area_slug_challenge_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."challenge_areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_campaign_id_test_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."test_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovations" ADD CONSTRAINT "innovations_area_slug_challenge_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."challenge_areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innovations" ADD CONSTRAINT "innovations_contact_org_id_organizations_id_fk" FOREIGN KEY ("contact_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_need_id_needs_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."needs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_innovation_id_innovations_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_area_slug_challenge_areas_slug_fk" FOREIGN KEY ("area_slug") REFERENCES "public"."challenge_areas"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_place_teryt_places_teryt_fk" FOREIGN KEY ("place_teryt") REFERENCES "public"."places"("teryt") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "needs" ADD CONSTRAINT "needs_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_events" ADD CONSTRAINT "status_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_campaigns" ADD CONSTRAINT "test_campaigns_innovation_id_innovations_id_fk" FOREIGN KEY ("innovation_id") REFERENCES "public"."innovations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_campaigns" ADD CONSTRAINT "test_campaigns_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_signups" ADD CONSTRAINT "test_signups_campaign_id_test_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."test_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_signups" ADD CONSTRAINT "test_signups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_assigned_expert_id_users_id_fk" FOREIGN KEY ("assigned_expert_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_ai_created_idx" ON "audit_ai" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "innovations_slug_idx" ON "innovations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_need_innovation_idx" ON "matches" USING btree ("need_id","innovation_id");--> statement-breakpoint
CREATE INDEX "matches_need_idx" ON "matches" USING btree ("need_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "needs_area_place_created_idx" ON "needs" USING btree ("area_slug","place_teryt","created_at");--> statement-breakpoint
CREATE INDEX "needs_status_idx" ON "needs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "status_events_subject_idx" ON "status_events" USING btree ("subject_type","subject_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "threads_subject_idx" ON "threads" USING btree ("subject_type","subject_id");