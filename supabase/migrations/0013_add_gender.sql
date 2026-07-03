-- Optional gender tag for clothing products.
alter table public.snapsell_products
  add column if not exists gender text not null default '';
