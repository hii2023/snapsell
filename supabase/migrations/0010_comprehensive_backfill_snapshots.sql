-- Comprehensive backfill: ensure all order_items have code and image snapshots
-- This runs even if only one field is missing, and handles cases where old orders
-- had code or image_url but they weren't captured at order time

UPDATE public.snapsell_order_items oi
SET
  code_snapshot = COALESCE(oi.code_snapshot, p.code),
  image_url_snapshot = COALESCE(oi.image_url_snapshot, p.image_url)
FROM public.snapsell_products p
WHERE oi.product_id = p.id;
