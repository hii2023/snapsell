// Canonical SEO strings for the public storefront.
// Kept separate from NEXT_PUBLIC_SHOP_NAME, which names the PWA/app shell and
// is deliberately short ("Thrift Shoppers"). Search results need the city and
// the parent charity, so those live here.
//
// India Recycles SELLS thrifted items to shoppers. It does not buy stock from
// the public, so no copy here may imply "sell your clothes to us".

export const STORE_HOST = "store.indiarecycles.org";
export const STORE_URL = `https://${STORE_HOST}`;
export const CHARITY_URL = "https://www.indiarecycles.org";

export const STORE_NAME = "India Recycles Thrift Store";
export const STORE_TITLE =
  "Thrift Store in Ahmedabad | Pre-Loved Clothes | India Recycles";
export const STORE_DESC =
  "Shop quality pre-loved clothes, bags and accessories in Ahmedabad. Every purchase funds India Recycles' community work. New thrifted pieces added regularly.";

export function isAdminHost(host: string | null | undefined): boolean {
  return (host || "").toLowerCase().startsWith("admin.");
}
