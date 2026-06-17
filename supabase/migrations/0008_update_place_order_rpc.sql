-- Update place_order RPC to capture product code and image snapshots

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
      order_id, product_id, qty, price_at_purchase, name_snapshot, size_snapshot, code_snapshot, image_url_snapshot
    ) values (
      v_order_id, v_product.id, v_qty, v_product.price, v_product.name, v_product.size, v_product.code, v_product.image_url
    );
  end loop;

  return v_order_id;
end;
$$;
