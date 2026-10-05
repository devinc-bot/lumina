ALTER TABLE purchases ADD COLUMN terminal_at timestamp with time zone;
--> statement-breakpoint
UPDATE purchases
SET terminal_at = now()
WHERE status IN ('expired', 'cancelled')
  AND terminal_at IS NULL;
