ALTER TABLE "needs" ADD COLUMN "moderation_reasons" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "needs" ADD COLUMN "moderation_approved_at" timestamp with time zone;