ALTER TABLE "organization_payment_connections"
ADD COLUMN "settlement_term" text DEFAULT '18_days' NOT NULL;
--> statement-breakpoint
ALTER TABLE "organization_payment_connections"
ADD CONSTRAINT "organization_payment_connections_settlement_term_valid"
CHECK ("settlement_term" IN ('instant', '10_days', '18_days', '35_days'));
