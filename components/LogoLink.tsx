"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

export default function LogoLink() {
  const pathname = usePathname();

  // If on admin pages (/orders, /sell), link to /orders dashboard
  // Otherwise, link to home shop page
  const href = pathname?.startsWith("/orders") || pathname?.startsWith("/sell") ? "/orders" : "/";

  return (
    <Link href={href}>
      <Logo />
    </Link>
  );
}
