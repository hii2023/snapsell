-- SnapSell schema, namespaced with snapsell_ because it shares a Supabase
-- project with other apps. No service-role key is needed anywhere: seller writes
-- go through the authenticated session (RLS), and public/customer + webhook
-- writes go through SECURITY DEFINER RPCs that are safe to call as anon.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.snapsell_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('apparel', 'food')),
  image_url text not null default '',
  size text not null default '',
  price integer not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists snapsell_products_live_idx
  on public.snapsell_products (created_at desc)
  where is_active and stock > 0;

create table if not exists public.snapsell_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  address text not null,
  total integer not null check (total >= 0),
  payment_mode text not null check (payment_mode in ('online', 'cod')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  delivery_provider text not null default 'manual'
    check (delivery_provider in ('manual', 'porter')),
  delivery_status text not null default 'unbooked'
    check (delivery_status in ('unbooked', 'booked', 'out_for_delivery', 'delivered')),
  delivery_tracking text,
  created_at timestamptz not null default now()
);

create index if not exists snapsell_orders_recent_idx
  on public.snapsell_orders (created_at desc);

-- One order per Razorpay order id: lets verify + webhook both finalize safely
-- without ever creating a duplicate order or decrementing stock twice.
create unique index if not exists snapsell_orders_rzp_uniq
  on public.snapsell_orders (razorpay_order_id)
  where razorpay_order_id is not null;

create table if not exists public.snapsell_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.snapsell_orders(id) on delete cascade,
  product_id uuid references public.snapsell_products(id) on delete set null,
  qty integer not null check (qty > 0),
  price_at_purchase integer not null check (price_at_purchase >= 0),
  name_snapshot text not null,
  size_snapshot text not null
);

create index if not exists snapsell_order_items_order_idx
  on public.snapsell_order_items (order_id);

create table if not exists public.snapsell_settings (
  id integer primary key default 1 check (id = 1),
  price_presets jsonb not null default '[99,199,299,499,999]'::jsonb,
  whatsapp_number text not null default '',
  pickup_address text not null default ''
);

insert into public.snapsell_settings (id) values (1)
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Atomic order placement (SECURITY DEFINER so anon checkout can call it).
-- p_items is jsonb: [{ "product_id": "..", "qty": 2 }, ...]
-- ---------------------------------------------------------------------------

create or replace function public.snapsell_place_order(
  p_customer_name text,
  p_phone text,
  p_address text,
  p_payment_mode text,
  p_payment_status text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_total integer := 0;
  v_item jsonb;
  v_product public.snapsell_products%rowtype;
  v_qty integer;
begin
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_product
      from public.snapsell_products
      where id = (v_item->>'product_id')::uuid
      for update;

    if not found then
      raise exception 'Product not found';
    end if;
    if v_product.stock < v_qty then
      raise exception 'OUT_OF_STOCK: % has only % left', v_product.name, v_product.stock;
    end if;

    v_total := v_total + (v_product.price * v_qty);
  end loop;

  insert into public.snapsell_orders (
    customer_name, phone, address, total,
    payment_mode, payment_status, razorpay_order_id, razorpay_payment_id
  ) values (
    p_customer_name, p_phone, p_address, v_total,
    p_payment_mode, p_payment_status, p_razorpay_order_id, p_razorpay_payment_id
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'qty')::integer;
    select * into v_product
      from public.snapsell_products
      where id = (v_item->>'product_id')::uuid
      for update;

    update public.snapsell_products
      set stock = stock - v_qty
      where id = v_product.id;

    insert into public.snapsell_order_items (
      order_id, product_id, qty, price_at_purchase, name_snapshot, size_snapshot
    ) values (
      v_order_id, v_product.id, v_qty, v_product.price, v_product.name, v_product.size
    );
  end loop;

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Idempotent online finalize: mark an existing order paid, or create it from
-- the cart in the Razorpay notes if the browser callback never fired. Called
-- by both /verify and the webhook (no session), so it is SECURITY DEFINER.
-- ---------------------------------------------------------------------------

create or replace function public.snapsell_finalize_online_order(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  select id into v_order_id
    from public.snapsell_orders
    where razorpay_order_id = p_razorpay_order_id
    for update;

  if found then
    update public.snapsell_orders
      set payment_status = 'paid',
          razorpay_payment_id = p_razorpay_payment_id
      where id = v_order_id
        and payment_status <> 'paid';
    return v_order_id;
  end if;

  return public.snapsell_place_order(
    p_customer_name, p_phone, p_address,
    'online', 'paid', p_razorpay_order_id, p_razorpay_payment_id, p_items
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.snapsell_products enable row level security;
alter table public.snapsell_orders enable row level security;
alter table public.snapsell_order_items enable row level security;
alter table public.snapsell_settings enable row level security;

drop policy if exists snapsell_products_public_read on public.snapsell_products;
create policy snapsell_products_public_read on public.snapsell_products
  for select using (is_active and stock > 0);

drop policy if exists snapsell_products_seller_all on public.snapsell_products;
create policy snapsell_products_seller_all on public.snapsell_products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists snapsell_orders_seller_read on public.snapsell_orders;
create policy snapsell_orders_seller_read on public.snapsell_orders
  for select using (auth.role() = 'authenticated');

drop policy if exists snapsell_orders_seller_update on public.snapsell_orders;
create policy snapsell_orders_seller_update on public.snapsell_orders
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists snapsell_items_seller_read on public.snapsell_order_items;
create policy snapsell_items_seller_read on public.snapsell_order_items
  for select using (auth.role() = 'authenticated');

drop policy if exists snapsell_settings_public_read on public.snapsell_settings;
create policy snapsell_settings_public_read on public.snapsell_settings
  for select using (true);

drop policy if exists snapsell_settings_seller_write on public.snapsell_settings;
create policy snapsell_settings_seller_write on public.snapsell_settings
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Anon + authenticated can run the safe RPCs; nothing else writes orders.
grant execute on function public.snapsell_place_order(
  text, text, text, text, text, text, text, jsonb
) to anon, authenticated;
grant execute on function public.snapsell_finalize_online_order(
  text, text, text, text, text, jsonb
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for product photos (public read, seller writes).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('snapsell-product-images', 'snapsell-product-images', true)
  on conflict (id) do nothing;

drop policy if exists snapsell_images_public_read on storage.objects;
create policy snapsell_images_public_read on storage.objects
  for select using (bucket_id = 'snapsell-product-images');

drop policy if exists snapsell_images_seller_write on storage.objects;
create policy snapsell_images_seller_write on storage.objects
  for insert with check (
    bucket_id = 'snapsell-product-images' and auth.role() = 'authenticated'
  );
