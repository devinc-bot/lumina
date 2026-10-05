ALTER TABLE purchases ALTER COLUMN user_id DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE purchases ADD COLUMN legal_hold_at timestamp with time zone;
