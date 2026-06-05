-- Per-category product codes (DR001, GR001, ...) and order fulfillment.
-- See applied migration snapsell_codes_and_fulfillment for the full body:
--  - adds snapsell_products.code + unique index
--  - adds snapsell_orders.fulfillment (delivery|pickup)
--  - snapsell_code_seq counter table + snapsell_code_prefix() + snapsell_assign_code() trigger
--  - backfills existing rows and advances the counters

alter table public.snapsell_products add column if not exists code text;
alter table public.snapsell_orders add column if not exists fulfillment text not null default 'delivery';
alter table public.snapsell_orders add constraint snapsell_orders_fulfillment_check
  check (fulfillment in ('delivery', 'pickup'));
-- (trigger, sequence table, backfill, and unique index applied in the same migration)
