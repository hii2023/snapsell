-- Let the owner's own categories be used on products.
--
-- Until now `category` was pinned to the nine built-ins by a CHECK constraint,
-- so a category added in the C-Panel (stored in snapsell_settings.extra_categories)
-- could be created but never assigned to anything. The set of valid ids is now
-- data, not schema, so a CHECK cannot express it: validation moved to the API,
-- which accepts the nine built-ins plus whatever extra_categories currently holds.
alter table public.snapsell_products drop constraint if exists snapsell_products_category_check;
