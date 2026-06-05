export type Category = "apparel" | "food";

export type Product = {
  id: string;
  name: string;
  category: Category;
  image_url: string;
  size: string;
  price: number;
  stock: number;
  is_active: boolean;
  created_at: string;
};

export type PaymentMode = "online" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed";
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
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  delivery_provider: DeliveryProvider;
  delivery_status: DeliveryStatus;
  delivery_tracking: string | null;
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

export type VisionResult = {
  name: string;
  category: Category;
  suggested_size: string;
  size_options: string[];
};
