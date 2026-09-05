"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Sidebar } from "primereact/sidebar";
import { Menu } from "primereact/menu";
import { Dialog } from "primereact/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faLocationDot,
  faMagnifyingGlass,
  faCartShopping,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";

import Logo from "@/lib/utils/assets/svg/Logo";
import Cart from "@/lib/ui/useable-components/cart";
import LocationPopover from "./location-popover";

import { useAuth } from "@/lib/context/auth/auth.context";
import { useUserAddress } from "@/lib/context/address/address.context";
import useUser from "@/lib/hooks/useUser";
import useServiceability from "@/lib/hooks/useServiceability";

import { setUserLocale } from "@/lib/utils/methods/locale";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { USER_CURRENT_LOCATION_LS_KEY } from "@/lib/utils/constants";

const ORANGE = "#1c5bc7";
const MAROON = "#16293f";

function shortAddress(address?: string | null, max = 28) {
  if (!address) return "";
  const clean = address.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

/**
 * FontAwesome icon with a hard pixel box. `fontawesome-svg-core` is configured
 * with `autoAddCss = false` (its stylesheet is imported once, app-wide) — but a
 * stale cached bundle can serve the page before that CSS applies, which renders
 * the raw SVG at its huge natural size in the header. Explicit width/height on
 * the <svg> keeps it sane no matter what.
 */
function Icon({
  icon,
  size = 14,
  className = "",
  color,
}: {
  icon: typeof faLocationDot;
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      style={{ width: size, height: size, ...(color ? { color } : {}) }}
    />
  );
}

function LocationButton({
  address,
  onClick,
  className = "",
  unavailable = false,
}: {
  address: string;
  onClick: () => void;
  className?: string;
  unavailable?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        unavailable
          ? `LocalSell doesn't deliver to ${address} yet`
          : address || "Set your delivery location"
      }
      className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-left transition hover:border-[#1c5bc7] dark:border-gray-700 ${
        unavailable ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30" : "border-slate-200"
      } ${className}`}
    >
      <Icon
        icon={faLocationDot}
        size={13}
        className="shrink-0"
        color={unavailable ? "#b45309" : MAROON}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            unavailable
              ? "text-amber-700 dark:text-amber-500"
              : "text-slate-400 dark:text-gray-500"
          }`}
        >
          {unavailable ? "Not available yet" : "Deliver to"}
        </span>
        <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">
          {address ? shortAddress(address) : "Set your location"}
        </span>
      </span>
      <Icon
        icon={faChevronDown}
        size={10}
        className="shrink-0 text-slate-400 transition group-hover:text-[#1c5bc7]"
      />
    </button>
  );
}

/**
 * The single application header — same chrome on every route (landing, discovery,
 * store, checkout, profile…). Clean LocalSell styling from the old LandingHeader,
 * with the working pieces from the old AppTopbar folded in: a delivery-location
 * selector, the cart sidebar, and the profile menu.
 */
export default function AppHeader() {
  const router = useRouter();
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const { setIsAuthModalVisible, authToken } = useAuth();
  const { userAddress, setUserAddress } = useUserAddress();
  const { cartCount, profile, logout } = useUser();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [sidebarSide, setSidebarSide] = useState<"left" | "right">("right");

  const profileMenuRef = useRef<Menu>(null);
  const didInitLocation = useRef(false);

  const isLoggedIn = Boolean(authToken);
  const isHindi = locale === "hi";

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

  const currentAddress = userAddress?.deliveryAddress || "";

  const { serviceable } = useServiceability();
  const locationUnavailable = serviceable === false;

  // Keep the cart sidebar on the reading-end edge in RTL locales.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const dir = document.documentElement.getAttribute("dir") || "ltr";
    setSidebarSide(dir === "rtl" ? "left" : "right");
  }, [locale]);

  // Hydrate the delivery location for the chip: a previously chosen location
  // (localStorage) wins, otherwise the customer's selected profile address.
  // We never auto-prompt for GPS here — the chip invites the customer to choose.
  useEffect(() => {
    if (didInitLocation.current || currentAddress) return;

    const stored = onUseLocalStorage("get", USER_CURRENT_LOCATION_LS_KEY);
    if (stored) {
      try {
        setUserAddress(JSON.parse(stored));
        didInitLocation.current = true;
        return;
      } catch {
        /* ignore malformed value */
      }
    }

    const selected = profile?.addresses?.find((a) => a.selected);
    if (selected) {
      setUserAddress(selected);
      didInitLocation.current = true;
    }
  }, [profile, currentAddress, setUserAddress]);

  const toggleLocale = () => {
    const next = isHindi ? "en" : "hi";
    startTransition(() => {
      (setUserLocale as unknown as (l: string) => Promise<void>)(next).then(() =>
        router.refresh(),
      );
    });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = searchTerm.trim();
    router.push(value ? `/search/${encodeURIComponent(value)}` : "/discovery");
  };

  const onLogout = () => {
    setIsLogoutOpen(false);
    void logout?.().finally(() => router.replace("/"));
  };

  const openLocation = () => setIsLocationOpen(true);

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

        <div className="relative hidden lg:block">
          <LocationButton
            address={currentAddress}
            onClick={openLocation}
            className="max-w-[240px]"
            unavailable={locationUnavailable}
          />
          <LocationPopover
            open={isLocationOpen}
            onClose={() => setIsLocationOpen(false)}
            currentAddress={currentAddress}
            anchorClassName="left-0"
          />
        </div>

        <form
          onSubmit={submitSearch}
          className="mx-auto hidden max-w-2xl flex-1 items-center rounded-full border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-[#1c5bc7] focus-within:ring-2 focus-within:ring-[#1c5bc7]/15 md:flex dark:border-gray-700 dark:bg-gray-800"
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
            className="p-1 text-slate-500 transition hover:text-[#16293f] dark:text-gray-300"
          >
            <Icon icon={faMagnifyingGlass} size={15} />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2.5 whitespace-nowrap text-[13px] font-semibold text-slate-700 dark:text-gray-200 sm:gap-4 sm:text-sm">
          <button
            type="button"
            onClick={toggleLocale}
            className="transition hover:text-[#16293f] dark:hover:text-blue-300"
            aria-label="Toggle language"
          >
            <span className={isHindi ? "text-[#16293f] dark:text-blue-300" : ""}>
              हिन्दी
            </span>
            <span className="mx-1 text-slate-300">/</span>
            <span
              className={!isHindi ? "text-[#16293f] dark:text-blue-300" : ""}
            >
              EN
            </span>
          </button>

          {isLoggedIn && (
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
              className="relative flex items-center gap-1.5 transition hover:text-[#16293f] dark:hover:text-blue-300"
            >
              <Icon icon={faCartShopping} size={16} />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span
                  className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white sm:static sm:ml-0.5 sm:h-5 sm:min-w-[20px]"
                  style={{ backgroundColor: ORANGE }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={(e) => profileMenuRef.current?.toggle(e)}
                aria-haspopup
                aria-controls="app_header_profile_menu"
                title={displayName}
                className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 transition hover:border-[#1c5bc7] dark:border-gray-600"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: MAROON }}
                >
                  {initials}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {displayName}
                </span>
                <Icon
                  icon={faChevronDown}
                  size={10}
                  className="hidden text-slate-400 sm:inline"
                />
              </button>
              <Menu
                popup
                ref={profileMenuRef}
                id="app_header_profile_menu"
                popupAlignment="right"
                className="mt-2 dark:bg-gray-800 dark:text-white"
                model={[
                  {
                    label: "Profile",
                    command: () => router.push("/profile"),
                  },
                  {
                    label: "My orders",
                    command: () => router.push("/profile"),
                  },
                  {
                    label: "Get help",
                    command: () => router.push("/profile/getHelp"),
                  },
                  { separator: true },
                  {
                    label: "Log out",
                    command: () => setIsLogoutOpen(true),
                  },
                ]}
              />
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

      {/* Mobile / tablet: dedicated location row so the top row stays uncluttered */}
      <div className="relative border-t border-slate-100 px-4 py-2 dark:border-gray-800 lg:hidden">
        <LocationButton
          address={currentAddress}
          onClick={openLocation}
          className="w-full"
          unavailable={locationUnavailable}
        />
        <LocationPopover
          open={isLocationOpen}
          onClose={() => setIsLocationOpen(false)}
          currentAddress={currentAddress}
          anchorClassName="left-4 right-4 w-auto"
        />
      </div>

      {/* Cart sidebar (logged-in only) */}
      <Sidebar
        position={sidebarSide}
        visible={isCartOpen}
        onHide={() => setIsCartOpen(false)}
        className="!m-0 !p-0 w-full md:w-[430px] lg:w-[560px] dark:bg-gray-800"
      >
        <Cart onClose={() => setIsCartOpen(false)} />
      </Sidebar>

      {/* Logout confirmation */}
      <Dialog
        visible={isLogoutOpen}
        onHide={() => setIsLogoutOpen(false)}
        dismissableMask
        maskClassName="bg-black/70"
        className="w-[92%] max-w-sm rounded-xl bg-white px-6 dark:bg-gray-800 dark:text-white"
        header={
          <span className="block w-full text-center text-lg font-bold">
            Log out of LocalSell?
          </span>
        }
        headerClassName="!justify-center dark:bg-gray-800"
      >
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsLogoutOpen(false)}
            className="w-1/2 rounded-full border border-slate-300 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-gray-600 dark:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-1/2 items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: ORANGE }}
          >
            <Icon icon={faSignOutAlt} size={14} />
            Log out
          </button>
        </div>
      </Dialog>
    </header>
  );
}
