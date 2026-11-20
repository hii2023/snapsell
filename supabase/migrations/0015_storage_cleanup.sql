-- Storage cleanup for the thrift store's photo bucket ONLY.
--
-- After the photo optimizer moved every product to a small .webp copy, the
-- full-size originals stayed in `snapsell-product-images` (about 1.1 GB) and
-- nothing points at them any more. The admin "Free up storage" tool removes
-- them. Every rule below is pinned to that one bucket, so the website's own
-- `site-images` bucket (same Supabase project) can never be touched.

-- 1. Let staff delete files, but only in the store bucket and only staff
--    accounts (@snapsell.app), not any signed-in user of the shared project.
drop policy if exists snapsell_images_seller_delete on storage.objects;
create policy snapsell_images_seller_delete on storage.objects
  for delete using (
    bucket_id = 'snapsell-product-images'
    and coalesce(auth.jwt() ->> 'email', '') ilike '%@snapsell.app'
  );

-- 2. Old orders still show the ORIGINAL photo in admin order history. Before
--    originals are removed, point each of those order lines at the product's
--    current .webp main photo so the thumbnail keeps working. Lines whose
--    product was deleted are left alone, and the cleanup tool then keeps the
--    original they use.
create or replace function public.snapsell_repoint_order_snapshots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if coalesce(auth.jwt() ->> 'email', '') not ilike '%@snapsell.app' then
    raise exception 'NOT_SELLER';
  end if;

  update public.snapsell_order_items oi
     set image_url_snapshot = p.image_url
    from public.snapsell_products p
   where oi.product_id = p.id
     and lower(p.image_url) like '%.webp'
     and coalesce(oi.image_url_snapshot, '') <> ''
     and lower(oi.image_url_snapshot) not like '%.webp';

  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.snapsell_repoint_order_snapshots() from public, anon;
grant execute on function public.snapsell_repoint_order_snapshots() to authenticated;
