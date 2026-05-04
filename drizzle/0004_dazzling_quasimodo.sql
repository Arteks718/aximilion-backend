CREATE TYPE "public"."currency" AS ENUM('USD', 'EUR', 'UAH');--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "currency" "currency" DEFAULT 'USD' NOT NULL;