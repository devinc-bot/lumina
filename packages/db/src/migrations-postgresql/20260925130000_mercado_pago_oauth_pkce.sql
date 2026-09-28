ALTER TABLE "mercado_pago_oauth_states" ADD COLUMN "code_verifier_encrypted" text;
--> statement-breakpoint
UPDATE "mercado_pago_oauth_states"
SET
  "code_verifier_encrypted" = '',
  "consumed_at" = COALESCE("consumed_at", now()),
  "updated_at" = now()
WHERE "code_verifier_encrypted" IS NULL;
--> statement-breakpoint
ALTER TABLE "mercado_pago_oauth_states" ALTER COLUMN "code_verifier_encrypted" SET NOT NULL;
