# SnapSell

A dead-simple, photo-first shop for a non-technical seller. Snap a photo, AI
fills in the product name and size, tap a price and units, and it goes live.
Customers buy with Cash on Delivery or Razorpay. Stock decrements automatically
and items disappear from the shop when they hit zero.

## Live

- Shop (public): https://snapsell-jet.vercel.app
- Seller add product: https://snapsell-jet.vercel.app/sell
- Seller orders + stock: https://snapsell-jet.vercel.app/orders
- Seller login: https://snapsell-jet.vercel.app/login

## Seller login

- Email: `seller@snapsell.app`
- Password: `Snapsell@2026`

Change the password anytime from the Supabase dashboard (Authentication > Users).
To use a different email, set `SELLER_EMAIL` and sign that account in.

## Tech

- Next.js (App Router) + Tailwind, hosted on Vercel
- Supabase (Postgres + Storage + Auth), shared project, all objects namespaced
  with `snapsell_`
- Claude vision for reading the product photo (optional)
- Razorpay for online payments (optional); COD always works
- Delivery adapter: `manual` (WhatsApp message, works now) or `porter` (when
  Porter merchant credentials are ready)

## Security model

No service-role key is used anywhere. Seller writes go through the authenticated
session (RLS). Public checkout and the payment webhook go through
`SECURITY DEFINER` RPCs (`snapsell_place_order`, `snapsell_finalize_online_order`)
that are safe to call as an anonymous user. Stock can never go negative or
oversell because placement is a single atomic transaction.

## Environment variables (set on Vercel)

Required (already set):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SELLER_EMAIL`
- `DELIVERY_PROVIDER=manual`
- `NEXT_PUBLIC_SHOP_NAME`

Optional (add later, no code change needed):
- `ANTHROPIC_API_KEY` - turns on AI photo reading
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
  - turns on Pay-online at checkout
- `SELLER_PICKUP_ADDRESS` - pickup point for the delivery booking message
- `PORTER_API_KEY`, `PORTER_BASE_URL` + flip `DELIVERY_PROVIDER=porter` when
  Porter API access is approved

After changing env vars on Vercel, redeploy: `vercel --prod`.

## Razorpay webhook (when you add Razorpay)

Point a Razorpay webhook at `/api/razorpay/webhook` for the `payment.captured`
event and set `RAZORPAY_WEBHOOK_SECRET`. This guarantees a paid order is never
lost even if the buyer closes the tab.

## Database

Schema lives in `supabase/migrations/0001_init.sql`. It was applied to the shared
Supabase project (tables, RLS, RPCs, and the `snapsell-product-images` bucket).

## Local development note

`next dev` currently hangs on this specific machine (a Node 25 environment quirk,
not a code issue). The Vercel build and production server are unaffected. If you
want local dev, try a different Node version (e.g. Node 20 LTS via nvm).
