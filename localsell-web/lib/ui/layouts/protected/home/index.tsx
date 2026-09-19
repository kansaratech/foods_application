"use client";

import { IProtectedHomeLayoutComponent } from "@/lib/utils/interfaces";
import { usePathname, useRouter } from "next/navigation";

// Svg
import { CutlerySvg, StoreSvg } from "@/lib/utils/assets/svg";
import PaddingContainer from "@/lib/ui/useable-components/containers/padding";
// context
import { useSearchUI } from "@/lib/context/search/search.context";
import TabItem from "@/lib/ui/useable-components/tab-item/TabItem";
import { useTranslations } from "next-intl";
import homeTabSvg from "@/lib/utils/assets/svg/houseTabsvg";

export default function HomeLayout({
  children,
}: IProtectedHomeLayoutComponent) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSearchFocused, setIsSearchFocused } = useSearchUI();

  const onChangeScreen = (name: "Discovery" | "Restaurants" | "Store") => {
    switch (name) {
      case "Discovery":
        router.push("/discovery");
        break;
      case "Restaurants":
        router.push("/restaurants");
        break;
      case "Store":
        router.push("/store");
        break;
      default:
        router.push("/discovery");
        break;
    }
  };

  const isDiscovery = pathname === "/discovery";
  const isRestaurants = pathname === "/restaurants";
  const isStore = pathname === "/store";

  const t = useTranslations();


  return (
    <div className="w-full min-w-0 flex flex-col pb-[calc(76px+env(safe-area-inset-bottom))] sm:pb-0">
      {/* click-away handler */}
      {isSearchFocused && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsSearchFocused(false);
          }}
          className="fixed inset-0 z-40 bg-transparent cursor-default"
        />
      )}
      {/* Sticky Top Tabs */}
      <div
        className={`sm:sticky sm:top-[var(--app-header-height,64px)] sm:left-0 fixed bottom-0 left-0 w-full bg-gray-100 dark:bg-gray-900 sm:bg-white z-30 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] sm:py-2 ${isSearchFocused && "opacity-0"}`}
      >
        <div className="flex justify-center items-center gap-1 sm:gap-4 p-1 sm:p-2 overflow-x-auto">
          <TabItem
            active={isDiscovery}
            label={t("tab_discovery")}
            onClick={() => onChangeScreen("Discovery")}
            Icon={homeTabSvg}
          />
          <TabItem
            active={isRestaurants}
            label={t("tab_restaurants")}
            onClick={() => onChangeScreen("Restaurants")}
            Icon={CutlerySvg}
          />
          <TabItem
            active={isStore}
            label={t("tab_store")}
            onClick={() => onChangeScreen("Store")}
            Icon={StoreSvg}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className={`flex-1 min-w-0 bg-white dark:bg-gray-900 mt-4 sm:mt-0 ${isSearchFocused && "blur-md cursor-default"}`}
      >
        <PaddingContainer>{children}</PaddingContainer>
      </div>
    </div>
  );
}
