ALTER TABLE "payments" DROP CONSTRAINT "payments_donor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."payment_status";--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'success', 'failed', 'refunded');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DATA TYPE "public"."payment_status" USING "status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "currency" varchar(10) DEFAULT 'usd' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "stripe_payment_intent_id" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_donor_id_users_supabase_uid_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("supabase_uid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "provider";--> statement-breakpoint
DROP TYPE "public"."payment_provider";