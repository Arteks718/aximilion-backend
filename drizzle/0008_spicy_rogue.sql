ALTER TABLE "media" ALTER COLUMN "file_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."media_file_type";--> statement-breakpoint
CREATE TYPE "public"."media_file_type" AS ENUM('gallery', 'cover', 'legal_proof', 'financial_audit');--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "file_type" SET DATA TYPE "public"."media_file_type" USING "file_type"::"public"."media_file_type";