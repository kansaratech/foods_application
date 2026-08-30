import { AuthContext } from "@/lib/context/global/auth.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useApptheme } from "@/lib/context/theme.context";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useContext, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import ConfirmModal from "@/lib/ui/useable-components/confirm-modal";

const navigation = [
  { label: "Orders", icon: "receipt-outline" as const, route: "/home/orders" },
  {
    label: "Work Schedule",
    icon: "time-outline" as const,
    route: "/home/work-schedule",
  },
  { label: "Menu", icon: "restaurant-outline" as const, route: "/home/menu" },
  { label: "Wallet", icon: "wallet-outline" as const, route: "/wallet" },
  { label: "Earnings", icon: "bar-chart-outline" as const, route: "/earnings" },
  {
    label: "Bank Management",
    icon: "card-outline" as const,
    route: "/home/bank-management",
  },
  { label: "Profile", icon: "person-outline" as const, route: "/profile" },
  {
    label: "Language",
    icon: "language-outline" as const,
    route: "/home/language",
  },
  { label: "Help", icon: "help-circle-outline" as const, route: "/home/help" },
  {
    label: "About Us",
    icon: "information-circle-outline" as const,
    route: "/home/about",
  },
  {
    label: "Privacy Policy",
    icon: "shield-checkmark-outline" as const,
    route: "/home/privacy",
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
    if (route === "/home/orders") return pathname.startsWith("/home/orders");
    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const initials = (dataProfile?.name ?? "Padharo Store")
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
          style={{ backgroundColor: "#8F173F" }}
        >
          <View className="flex-row items-center">
            <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center">
              <Text className="font-bold" style={{ color: "#8F173F" }}>
                {initials}
              </Text>
            </View>
            {!collapsed && (
              <View className="ml-3 flex-1">
                <Text
                  className="text-white text-lg font-bold"
                  numberOfLines={1}
                >
                  Padharo
                </Text>
                <Text className="text-white/70 text-xs">
                  Merchant workspace
                </Text>
              </View>
            )}
          </View>
          {!collapsed && (
            <View className="mt-4">
              <Text className="text-white font-semibold" numberOfLines={1}>
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

        <ScrollView
          contentContainerStyle={{
            padding: collapsed ? 10 : 12,
            paddingBottom: 20,
          }}
        >
          {navigation.map((item) => {
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
        </ScrollView>
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
