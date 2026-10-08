CREATE TABLE "otps" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "type" text NOT NULL,
  "subject_document_id" text NOT NULL,
  "scope" text NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "consumed_at" timestamp with time zone,
  "invalidated_at" timestamp with time zone,
  CONSTRAINT "otps_document_id_unique" UNIQUE("document_id"),
  CONSTRAINT "otps_type_valid" CHECK ("type" IN ('mercado_pago_connection', 'mercado_pago_disconnection')),
  CONSTRAINT "otps_failed_attempts_valid" CHECK ("failed_attempts" >= 0 AND "failed_attempts" <= 4)
);
--> statement-breakpoint
CREATE INDEX "otps_subject_type_created_idx" ON "otps" USING btree ("subject_document_id", "type", "created_at");
--> statement-breakpoint
CREATE INDEX "otps_type_expiry_idx" ON "otps" USING btree ("type", "expires_at");
--> statement-breakpoint
ALTER TABLE "mercado_pago_oauth_states" ADD COLUMN "otp_verified_at" timestamp with time zone;
