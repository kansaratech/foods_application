"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import Logo from "@/lib/utils/assets/svg/Logo";
import { useAuth } from "@/lib/context/auth/auth.context";
import useUser from "@/lib/hooks/useUser";
import { setUserLocale } from "@/lib/utils/methods/locale";

export default function LandingHeader() {
  const router = useRouter();
  const locale = useLocale();
  const [, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const { setIsAuthModalVisible, authToken } = useAuth();
  const { cartCount, profile } = useUser();

  const isLoggedIn = Boolean(authToken);
  const displayName =
    profile?.name?.trim() || profile?.email?.split("@")[0] || "Account";
  const initials =
    (profile?.name || profile?.email || "U")
      .trim()
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const isHindi = locale === "hi";
  const toggleLocale = () => {
    const next = isHindi ? "en" : "hi";
    startTransition(() => {
      // setUserLocale is a server action; the union type in the local .d.ts is
      // stale (the app ships 18+ locales), so widen through unknown.
      (setUserLocale as unknown as (l: string) => Promise<void>)(next).then(
        () => router.refresh(),
      );
    });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = searchTerm.trim();
    router.push(value ? `/search/${encodeURIComponent(value)}` : "/discovery");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="flex h-16 w-full items-center gap-2 px-4 sm:gap-4 md:px-6 lg:px-12 xl:px-20 2xl:px-[80px]">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="LocalSell home"
        >
          <Logo fillColor="#000000" darkmode="#FFFFFF" />
        </Link>

        <form
          onSubmit={submitSearch}
          className="mx-auto hidden max-w-2xl flex-1 items-center rounded-full border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-[#1c5bc7] focus-within:ring-2 focus-within:ring-[#1c5bc7]/15 md:flex"
        >
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search restaurants, stores or items"
            aria-label="Search restaurants, stores or items"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          <button
            type="submit"
            aria-label="Search"
            className="p-1 text-slate-600 transition hover:text-[#16293f]"
          >
            <i className="pi pi-search" aria-hidden="true" />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2.5 whitespace-nowrap text-[13px] font-semibold text-slate-700 dark:text-gray-200 sm:gap-5 sm:text-sm">
          <button
            type="button"
            onClick={toggleLocale}
            className="transition hover:text-[#16293f] dark:hover:text-blue-300"
            aria-label="Toggle language"
          >
            <span
              className={isHindi ? "text-[#16293f] dark:text-blue-300" : ""}
            >
              हिन्दी
            </span>
            <span className="mx-1 text-slate-300">/</span>
            <span
              className={!isHindi ? "text-[#16293f] dark:text-blue-300" : ""}
            >
              EN
            </span>
          </button>

          <Link
            href="/discovery"
            className="hidden transition hover:text-[#16293f] dark:hover:text-blue-300 sm:inline"
          >
            Cart{cartCount > 0 ? ` (${cartCount})` : ""}
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                href="/discovery"
                className="hidden rounded-full bg-[#1c5bc7] px-4 py-1.5 font-bold text-white transition hover:brightness-95 sm:inline"
              >
                Browse stores
              </Link>
              <Link
                href="/profile"
                title={displayName}
                className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition hover:border-[#1c5bc7] dark:border-gray-600"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16293f] text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {displayName}
                </span>
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalVisible(true)}
              className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 font-bold text-slate-900 transition hover:border-[#1c5bc7] hover:text-[#16293f] dark:border-gray-600 dark:text-white sm:px-4"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
