-- Backfill existing order_items with product code and image from products table

UPDATE public.snapsell_order_items oi
SET
  code_snapshot = p.code,
  image_url_snapshot = p.image_url
FROM public.snapsell_products p
WHERE oi.product_id = p.id
  AND (oi.code_snapshot = '' OR oi.code_snapshot IS NULL)
  AND (oi.image_url_snapshot = '' OR oi.image_url_snapshot IS NULL);
