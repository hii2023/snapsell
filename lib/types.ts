export type Category =
  | "apparel"
  | "food"
  | "electronics"
  | "furniture"
  | "cleaning"
  | "jewellery"
  | "cosmetics";

export type Product = {
  id: string;
  name: string;
  code: string;
  category: Category;
  subcategory: string;
  image_url: string;
  images: string[];
  description: string;
  size: string;
  color: string;
  price: number;
  mrp: number;
  giveaway: boolean;
  stock: number;
  is_active: boolean;
  created_at: string;
};

export type PaymentMode = "online" | "cod" | "qr";
export type PaymentStatus = "pending" | "paid" | "failed";
export type Fulfillment = "delivery" | "pickup";
export type DeliveryProvider = "manual" | "porter";
export type DeliveryStatus =
  | "unbooked"
  | "booked"
  | "out_for_delivery"
  | "delivered";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;
  price_at_purchase: number;
  name_snapshot: string;
  size_snapshot: string;
};

export type Order = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  delivery_fee: number;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  fulfillment: Fulfillment;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  delivery_provider: DeliveryProvider;
  delivery_status: DeliveryStatus;
  delivery_tracking: string | null;
  pickup_date: string;
  pickup_time: string;
  return_status: string;
  refund_status: string;
  refund_amount: number;
  created_at: string;
  order_items?: OrderItem[];
};

export type CartLine = {
  product_id: string;
  name: string;
  size: string;
  price: number;
  qty: number;
  image_url: string;
  stock: number;
};

export type ExtraCategory = { id: string; label: string; subs: string[] };

export type Settings = {
  price_presets: number[];
  upi_id: string;
  upi_name: string;
  whatsapp_number: string;
  pickup_address: string;
  delivery_fee_amount: number;
  delivery_free_above: number;
  extra_categories: ExtraCategory[];
  subcats: Record<string, string[]>;
};

export type VisionResult = {
  name: string;
  category: Category;
  suggested_size: string;
  suggested_color: string;
  size_options: string[];
};
