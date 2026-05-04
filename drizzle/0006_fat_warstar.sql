ALTER TABLE "campaigns" ADD COLUMN "images" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "legal_proof_url" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "financial_audit_url" text;