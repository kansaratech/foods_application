"use client";

import Link from "next/link";
import Logo from "@/lib/utils/assets/svg/Logo";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Order",
    links: [
      { label: "All stores", href: "/discovery" },
      { label: "Offers", href: "/discovery" },
      { label: "Track an order", href: "/profile/order-history" },
    ],
  },
  {
    title: "Partner",
    links: [
      { label: "List your store", href: "/restaurantInfo" },
      { label: "Ride with LocalSell", href: "/rider" },
      { label: "Store login", href: "/restaurantInfo" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Support", href: "/profile/getHelp" },
      { label: "Terms & privacy", href: "/terms" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="bg-[#16293f] text-white">
      <div className="grid w-full gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-12 lg:py-16 xl:px-20 2xl:px-[80px]">
        <div className="max-w-xs">
          <Logo fillColor="#FFFFFF" darkmode="#FFFFFF" />
          <p className="mt-4 text-sm leading-6 text-white/70">
            {MARKETPLACE_LOCATION.city}&apos;s kitchens, grocers and sweet shops,
            delivered in about half an hour.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
              {column.title}
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-white/85 transition hover:text-[#1c5bc7]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="w-full px-4 py-5 text-xs text-white/50 md:px-6 lg:px-12 xl:px-20 2xl:px-[80px]">
          © {new Date().getFullYear()} LocalSell. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
