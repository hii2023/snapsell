-- Expand categories to four and add a colour attribute for the card wizard.

alter table public.snapsell_products drop constraint if exists snapsell_products_category_check;
alter table public.snapsell_products add constraint snapsell_products_category_check
  check (category in ('apparel', 'food', 'electronics', 'furniture'));

alter table public.snapsell_products add column if not exists color text not null default '';
