-- Add a cleaning/chemical category and refresh the default price presets.

alter table public.snapsell_products drop constraint if exists snapsell_products_category_check;
alter table public.snapsell_products add constraint snapsell_products_category_check
  check (category in ('apparel', 'food', 'electronics', 'furniture', 'cleaning'));

update public.snapsell_settings set price_presets = '[49,99,199,299,499,999]'::jsonb where id = 1;
alter table public.snapsell_settings alter column price_presets set default '[49,99,199,299,499,999]'::jsonb;
