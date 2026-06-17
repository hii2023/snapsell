-- Add product code and image snapshots to order_items for admin display

ALTER TABLE public.snapsell_order_items
ADD COLUMN IF NOT EXISTS code_snapshot text default '',
ADD COLUMN IF NOT EXISTS image_url_snapshot text default '';
