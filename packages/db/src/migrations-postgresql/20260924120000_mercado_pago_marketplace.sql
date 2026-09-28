CREATE TABLE "organization_payment_connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "organization_id" integer NOT NULL,
  "provider" text NOT NULL,
  "seller_id" text,
  "status" text DEFAULT 'disconnected' NOT NULL,
  "is_live_mode" integer DEFAULT 0 NOT NULL,
  "granted_scopes" text[] DEFAULT '{}' NOT NULL,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_lock_token" text,
  "refresh_lock_expires_at" timestamp with time zone,
  "encryption_key_version" text,
  "connected_at" timestamp with time zone,
  "refreshed_at" timestamp with time zone,
  "reconnect_required_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "failure_code" text,
  CONSTRAINT "organization_payment_connections_document_id_unique" UNIQUE("document_id"),
  CONSTRAINT "organization_payment_connections_provider_valid" CHECK ("provider" = 'mercado_pago')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_payment_connections_provider_organization_unique" ON "organization_payment_connections" ("organization_id", "provider");
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_payment_connections_provider_seller_unique" ON "organization_payment_connections" ("provider", "seller_id") WHERE "seller_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE "mercado_pago_oauth_states" (
  "id" serial PRIMARY KEY NOT NULL,
  "document_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "organization_id" integer NOT NULL,
  "owner_document_id" text NOT NULL,
  "state_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  CONSTRAINT "mercado_pago_oauth_states_document_id_unique" UNIQUE("document_id"),
  CONSTRAINT "mercado_pago_oauth_states_hash_unique" UNIQUE("state_hash")
);
--> statement-breakpoint
ALTER TABLE "organization_payment_connections" ADD CONSTRAINT "organization_payment_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
--> statement-breakpoint
ALTER TABLE "mercado_pago_oauth_states" ADD CONSTRAINT "mercado_pago_oauth_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "subtotal_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "platform_fee_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "provider_fee_quoted_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "pricing_policy_version" varchar(64);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "is_provider_fee_estimated" integer;
--> statement-breakpoint
UPDATE "purchases" SET "subtotal_amount" = "total_amount", "platform_fee_amount" = 0, "provider_fee_quoted_amount" = 0, "pricing_policy_version" = 'legacy', "is_provider_fee_estimated" = 0 WHERE "subtotal_amount" IS NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "credential_source" text DEFAULT 'organization_connection' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "organization_payment_connection_id" integer;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_seller_id" text;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "credential_access_token_encrypted" text;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "credential_refresh_token_encrypted" text;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "credential_access_token_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_fee_actual_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_financing_fee_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "provider_taxes_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "marketplace_fee_actual_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "owner_net_amount" numeric(12,2);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_payment_connection_id_fk" FOREIGN KEY ("organization_payment_connection_id") REFERENCES "organization_payment_connections"("id");
