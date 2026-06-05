import type { Order } from "./types";

export type DeliveryQuote = {
  provider: "manual" | "porter";
  // For manual: a ready-to-send message + a deep link the seller can tap.
  message: string;
  link: string;
  // For porter (when live): tracking info.
  tracking?: string | null;
};

function pickupAddress(): string {
  return process.env.SELLER_PICKUP_ADDRESS || "Shop pickup address (set SELLER_PICKUP_ADDRESS)";
}

// Composes a delivery booking. The manual adapter needs no credentials and
// works on day one: it builds a WhatsApp / Porter-app friendly message with
// pickup + drop + order details for the seller to confirm. Flip
// DELIVERY_PROVIDER=porter once Porter merchant credentials are approved.
export async function bookDelivery(order: Order): Promise<DeliveryQuote> {
  const provider = (process.env.DELIVERY_PROVIDER || "manual") as
    | "manual"
    | "porter";

  if (provider === "porter" && process.env.PORTER_API_KEY) {
    return bookPorter(order);
  }
  return bookManual(order);
}

function orderSummary(order: Order): string {
  const lines = (order.order_items || [])
    .map((i) => `${i.qty} x ${i.name_snapshot} (${i.size_snapshot})`)
    .join(", ");
  return lines || "Order items";
}

function bookManual(order: Order): DeliveryQuote {
  const msg = [
    "New delivery booking",
    `Pickup: ${pickupAddress()}`,
    `Drop: ${order.customer_name}, ${order.phone}`,
    `Address: ${order.address}`,
    `Items: ${orderSummary(order)}`,
    `Amount: ₹${order.total} (${order.payment_mode === "cod" ? "Collect cash on delivery" : "Already paid"})`,
  ].join("\n");

  return {
    provider: "manual",
    message: msg,
    // Opens WhatsApp with the message prefilled so the seller can forward it
    // to their delivery rider or to Porter support.
    link: "https://wa.me/?text=" + encodeURIComponent(msg),
  };
}

// Placeholder for the live Porter integration. Wired to the real
// quote -> create -> track calls once PORTER_API_KEY is provisioned.
async function bookPorter(order: Order): Promise<DeliveryQuote> {
  // The Porter "Create Order" API flow goes here:
  //   1. POST /v1/get_quote  -> fare estimate
  //   2. POST /v1/orders/create -> booking + tracking url
  // Until credentials are live we fall back to manual so nothing breaks.
  const manual = bookManual(order);
  return { ...manual, provider: "manual" };
}
