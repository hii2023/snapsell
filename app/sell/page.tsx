import { redirect } from "next/navigation";

// Adding a product happens in a modal on the dashboard now, not on its own page.
export default function SellRedirect() {
  redirect("/orders");
}
