-- Allow the "books" category on products.
alter table public.snapsell_products drop constraint if exists snapsell_products_category_check;
alter table public.snapsell_products add constraint snapsell_products_category_check
  check (category in ('apparel', 'food', 'electronics', 'furniture', 'cleaning', 'jewellery', 'cosmetics', 'books'));
