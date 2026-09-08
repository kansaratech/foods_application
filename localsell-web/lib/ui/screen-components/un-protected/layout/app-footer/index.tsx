"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FiArrowUpRight, FiMapPin } from "react-icons/fi";

import InstallAppButton from "@/lib/ui/pwa/InstallAppButton";

const footerGroups = [
  {
    title: "Partner with LocalSell",
    links: [
      { label: "For riders", href: "/rider" },
      { label: "For restaurants", href: "/restaurantInfo" },
      { label: "Start ordering", href: "/discovery" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Restaurants", href: "/discovery" },
      { label: "Grocery stores", href: "/store" },
      { label: "Your orders", href: "/profile/order-history" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Get help", href: "/profile/getHelp" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms & conditions", href: "/terms" },
    ],
  },
];

const AppFooter = () => {
  const pathname = usePathname();
  const t = useTranslations();
  const needsMobileNavSpace =
    pathname?.endsWith("/restaurants") ||
    pathname?.endsWith("/discovery") ||
    pathname?.endsWith("/store");

  return (
    <footer className={`relative overflow-hidden bg-[#0e1b2b] text-white ${needsMobileNavSpace ? "pb-20 md:pb-0" : ""}`}>
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#16293f] via-[#1c4a8f] to-[#16345f] px-5 py-10 sm:px-8 lg:min-h-[430px] lg:px-[4.5vw] lg:py-14">
          <div aria-hidden="true" className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full border-[70px] border-white/[0.035]" />
          <div className="relative flex h-full max-w-xl flex-col justify-between gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">LocalSell to something better</p>
              <h2 className="mt-5 max-w-lg text-[38px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-[54px]">
                Local favourites,
                <span className="block font-serif font-normal italic text-[#8fbdf0]">closer than ever.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/65">Restaurants, groceries and everyday essentials from your neighbourhood, delivered to your door.</p>
              <Link href="/discovery" className="mt-7 inline-flex w-fit items-center gap-2 border-b border-[#8fbdf0] pb-1.5 text-sm font-bold text-white transition hover:gap-3 hover:text-[#8fbdf0]">
                Explore near you <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>

            <div className="flex flex-col gap-2.5">
              <InstallAppButton variant="footer" />
              <p className="text-[11px] leading-none text-white/40">{t("pwa.footerCaption")}</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between px-5 py-10 sm:px-8 lg:min-h-[430px] lg:px-[4.5vw] lg:py-14">
          <div>
            <Link href="/" aria-label="LocalSell home" className="inline-block">
              <Image src="/assets/brand/localsell-logo-inverse.png" alt="LocalSell" width={150} height={46} className="h-auto w-[138px] object-contain" />
            </Link>
            <div className="mt-10 grid gap-9 sm:grid-cols-3">
              {footerGroups.map((group) => (
                <nav key={group.title} aria-label={group.title}>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8fbdf0]">{group.title}</h3>
                  <ul className="mt-5 space-y-3.5">
                    {group.links.map((item) => (
                      <li key={item.label}>
                        <Link href={item.href} className="text-sm text-white/60 transition hover:text-white">{item.label}</Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>© {new Date().getFullYear()} LocalSell, operated by Maekotech Solutions LLP</span>
              <span className="inline-flex items-center gap-1.5"><FiMapPin aria-hidden="true" className="text-[#1c5bc7]" /> Deogarh, Rajasthan</span>
            </div>
          </div>
        </section>
      </div>
    </footer>
  );
};

AppFooter.displayName = "AppFooter";

export default AppFooter;
