DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE status = 'pending') THEN
    RAISE EXCEPTION 'Legacy order retirement failed: pending legacy orders remain';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN purchases p ON p.document_id = o.document_id
    WHERE p.id IS NULL
      OR p.user_id IS DISTINCT FROM o.user_id
      OR p.total_amount IS DISTINCT FROM o.amount
      OR p.status IS DISTINCT FROM CASE o.status
        WHEN 'completed' THEN 'confirmed'
        WHEN 'pending' THEN 'expired'
        ELSE 'cancelled'
      END
      OR p.confirmed_at IS DISTINCT FROM CASE WHEN o.status = 'completed' THEN o.paid_at END
      OR (SELECT count(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) <> 1
      OR NOT EXISTS (
        SELECT 1
        FROM purchase_items pi
        WHERE pi.purchase_id = p.id
          AND pi.ticket_id = o.ticket_id
          AND pi.quantity = o.quantity
          AND pi.line_total = o.amount
      )
      OR (SELECT count(*) FROM payments pay WHERE pay.purchase_id = p.id) <> 1
      OR NOT EXISTS (
        SELECT 1
        FROM payments pay
        WHERE pay.purchase_id = p.id
          AND pay.amount = o.amount
          AND pay.provider = o.provider
          AND pay.provider_preference_id IS NOT DISTINCT FROM o.external_order_id
          AND pay.metadata IS NOT DISTINCT FROM o.metadata
          AND pay.status IS NOT DISTINCT FROM CASE o.status
            WHEN 'completed' THEN 'approved'
            WHEN 'pending' THEN 'cancelled'
            ELSE o.status
          END
          AND pay.paid_at IS NOT DISTINCT FROM o.paid_at
      )
  ) THEN
    RAISE EXCEPTION 'Legacy order retirement failed: normalized purchase parity mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM orders o
    LEFT JOIN tickets_sold ts ON ts.order_id = o.id
    LEFT JOIN purchases p ON p.document_id = o.document_id
    LEFT JOIN purchase_items pi ON pi.purchase_id = p.id AND pi.ticket_id = o.ticket_id
    GROUP BY o.id, o.status, o.quantity, pi.id
    HAVING (o.status = 'completed' AND count(ts.id) <> o.quantity)
      OR (o.status IS DISTINCT FROM 'completed' AND count(ts.id) <> 0)
      OR count(ts.id) FILTER (
        WHERE ts.purchase_item_id IS DISTINCT FROM pi.id OR ts.unit_index IS NULL
      ) <> 0
      OR count(DISTINCT ts.unit_index) <> count(ts.id)
  ) THEN
    RAISE EXCEPTION 'Legacy order retirement failed: issued ticket parity mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tickets_sold
    WHERE purchase_item_id IS NULL OR unit_index IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy order retirement failed: unlinked issued ticket';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE tickets_sold DROP CONSTRAINT IF EXISTS tickets_sold_order_id_orders_id_fk;
--> statement-breakpoint
ALTER TABLE tickets_sold DROP COLUMN order_id;
--> statement-breakpoint
DROP TABLE orders;
