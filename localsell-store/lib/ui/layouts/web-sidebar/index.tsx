import { AuthContext } from "@/lib/context/global/auth.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useApptheme } from "@/lib/context/theme.context";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useContext, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import ConfirmModal from "@/lib/ui/useable-components/confirm-modal";
import { IMAGES } from "@/lib/assets/images";
import ScrollArea from "./scroll-area";

type NavItem = { label: string; icon: keyof typeof Ionicons.glyphMap; route: string };
type NavSection = { title: string | null; items: NavItem[] };

const navSections: NavSection[] = [
  {
    title: null,
    items: [
      { label: "Live Orders", icon: "receipt-outline", route: "/home/orders" },
      { label: "Order History", icon: "time-outline", route: "/home/orders/delivered" },
      { label: "Menu", icon: "restaurant-outline", route: "/home/menu" },
      { label: "Work Schedule", icon: "calendar-outline", route: "/home/work-schedule" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { label: "Delivery Settings", icon: "bicycle-outline", route: "/home/delivery-settings" },
      { label: "Delivery Staff", icon: "people-outline", route: "/home/delivery-staff" },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Reports", icon: "bar-chart-outline", route: "/home/reports" },
      { label: "Earnings", icon: "cash-outline", route: "/earnings" },
      { label: "Wallet", icon: "wallet-outline", route: "/wallet" },
      { label: "Bank Management", icon: "card-outline", route: "/home/bank-management" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", icon: "person-outline", route: "/profile" },
      { label: "Language", icon: "language-outline", route: "/home/language" },
      { label: "Help", icon: "help-circle-outline", route: "/home/help" },
      { label: "About Us", icon: "information-circle-outline", route: "/home/about" },
      { label: "Privacy Policy", icon: "shield-checkmark-outline", route: "/home/privacy" },
    ],
  },
];

export default function WebSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const { appTheme } = useApptheme();
  const { dataProfile } = useUserContext();
  const { logout } = useContext(AuthContext);

  const isActive = (route: string) => {
    if (route === "/home/orders") {
      return (
        pathname.startsWith("/home/orders") &&
        !pathname.startsWith("/home/orders/delivered")
      );
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const initials = (dataProfile?.name ?? "LocalSell Store")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const sidebarWidth = collapsed ? 76 : 280;

  const navigateTo = (route: string) => {
    router.push(route as never);
    setCollapsed(true);
  };

  return (
    <View
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 76,
        width: 76,
        minWidth: 76,
        maxWidth: 76,
        zIndex: 100,
      }}
    >
      <TouchableOpacity
        onPress={() => setCollapsed((value) => !value)}
        style={{
          position: "absolute",
          left: sidebarWidth + 14,
          top: 14,
          zIndex: 102,
          width: 42,
          height: 42,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: appTheme.cartContainer,
          borderWidth: 1,
          borderColor: appTheme.borderLineColor,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        }}
        accessibilityLabel={collapsed ? "Open navigation" : "Close navigation"}
        accessibilityRole="button"
      >
        <Ionicons
          name={collapsed ? "menu-outline" : "close-outline"}
          size={24}
          color={appTheme.fontMainColor}
        />
      </TouchableOpacity>

      <View
        className="border-r"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: sidebarWidth,
          backgroundColor: appTheme.cartContainer,
          borderRightColor: appTheme.borderLineColor,
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
          overflow: "hidden",
          shadowColor: "#0F172A",
          shadowOffset: { width: 8, height: 0 },
          shadowOpacity: collapsed ? 0 : 0.18,
          shadowRadius: 18,
        }}
      >
        <View
          className={collapsed ? "px-3 pt-5 pb-4" : "px-5 pt-5 pb-5"}
          style={{ backgroundColor: appTheme.brand }}
        >
          <View className="flex-row items-center">
            <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center">
              <Text className="font-bold" style={{ color: appTheme.brand }}>
                {initials}
              </Text>
            </View>
            {!collapsed && (
              <View className="ml-3 flex-1">
                <Text
                  className="text-white text-lg font-bold"
                  numberOfLines={1}
                >
                  {dataProfile?.name ?? "Restaurant"}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: dataProfile?.isAvailable
                        ? "#4ADE80"
                        : "#FBBF24",
                    }}
                  />
                  <Text className="text-white/70 text-xs ml-2">
                    {dataProfile?.isAvailable
                      ? "Accepting orders"
                      : "Store offline"}
                  </Text>
                </View>
              </View>
            )}
          </View>
          {!collapsed && (
            <View className="mt-4 flex-row items-center">
              <Image
                source={IMAGES.brandLogoInverse}
                style={{ width: 88, height: 24 }}
                resizeMode="contain"
              />
              <Text className="text-white/40 text-[10px] tracking-[2px] uppercase ml-2">
                Merchant
              </Text>
            </View>
          )}
        </View>

        <ScrollArea
          deps={[collapsed]}
          contentStyle={{
            padding: collapsed ? 10 : 12,
            paddingBottom: 20,
          }}
        >
          {navSections.map((section, si) => (
            <View key={section.title ?? `section-${si}`} className={si > 0 ? "mt-3" : ""}>
              {!collapsed && section.title && (
                <Text
                  className="px-3 mb-1 text-[11px] font-bold uppercase"
                  style={{ color: appTheme.fontSecondColor, letterSpacing: 1 }}
                >
                  {section.title}
                </Text>
              )}
              {collapsed && si > 0 && (
                <View
                  className="mx-3 mb-2"
                  style={{ height: 1, backgroundColor: appTheme.borderLineColor }}
                />
              )}
              {section.items.map((item) => {
                const active = isActive(item.route);
                return (
                  <TouchableOpacity
                    key={item.route}
                    onPress={() => navigateTo(item.route)}
                    className="h-12 flex-row items-center rounded-xl px-3 mb-1"
                    style={{
                      justifyContent: collapsed ? "center" : "flex-start",
                      backgroundColor: active
                        ? appTheme.lowOpacityPrimaryColor
                        : "transparent",
                    }}
                    accessibilityLabel={item.label}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? appTheme.primary : appTheme.fontSecondColor}
                    />
                    {!collapsed && (
                      <Text
                        className="ml-3 text-sm"
                        style={{
                          color: active ? appTheme.primary : appTheme.fontMainColor,
                          fontWeight: active ? "700" : "500",
                        }}
                      >
                        {item.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View
            className="border-t mt-2 pt-2"
            style={{ borderTopColor: appTheme.borderLineColor }}
          >
            <TouchableOpacity
              onPress={() => setLogoutOpen(true)}
              className="h-12 flex-row items-center rounded-xl px-3"
              style={{ justifyContent: collapsed ? "center" : "flex-start" }}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={appTheme.textErrorColor}
              />
              {!collapsed && (
                <Text
                  className="ml-3 text-sm font-semibold"
                  style={{ color: appTheme.textErrorColor }}
                >
                  Logout
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollArea>
      </View>

      <ConfirmModal
        visible={logoutOpen}
        title="Log out?"
        message="You'll need to sign in again to manage orders and your menu."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        destructive
        icon="log-out-outline"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout?.();
        }}
      />
    </View>
  );
}
