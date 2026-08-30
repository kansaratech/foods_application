import { useApptheme } from "@/lib/context/theme.context";
import { HapticTab } from "@/lib/ui/useable-components/HapticTab";
import WebSidebar from "@/lib/ui/layouts/web-sidebar";
import {
  CurrencyIcon,
  HomeIcon,
  PersonIcon,
  WalletIcon,
} from "@/lib/ui/useable-components/svg";
import { Tabs, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform, useWindowDimensions } from "react-native";

const RootLayout = () => {
  const pathName = usePathname();
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= 1024;

  return (
    <Tabs
      tabBar={isDesktopWeb ? () => <WebSidebar /> : undefined}
      screenOptions={{
        tabBarPosition: isDesktopWeb ? "left" : "bottom",
        tabBarLabelPosition: isDesktopWeb ? "beside-icon" : "below-icon",
        tabBarActiveTintColor: appTheme.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
            backgroundColor: appTheme.tabNaviatorBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 0.5,
            shadowColor: appTheme.black,
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            zIndex: 0,
          },
          android: {
            position: "absolute",
            backgroundColor: appTheme.tabNaviatorBackground,
            display: pathName.startsWith("/wallet/success") ? "none" : "flex",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 0.5,
            elevation: 5,
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
          },
          web: isDesktopWeb
            ? {
                width: 236,
                paddingTop: 28,
                paddingHorizontal: 12,
                backgroundColor: appTheme.cartContainer,
                borderRightWidth: 1,
                borderRightColor: appTheme.borderLineColor,
              }
            : {
                height: 64,
                backgroundColor: appTheme.cartContainer,
                borderTopWidth: 1,
                borderTopColor: appTheme.borderLineColor,
              },
        }),
        tabBarItemStyle: isDesktopWeb
          ? { height: 56, borderRadius: 14, marginVertical: 4 }
          : undefined,
        tabBarLabelStyle: isDesktopWeb
          ? { fontSize: 15, fontWeight: "600", marginLeft: 10 }
          : undefined,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          href: "/(protected)/(tabs)/home/orders",
          title: t("Home"),
          tabBarIcon: ({ color }) => (
            <HomeIcon
              color={color}
              width={25}
              height={25}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t("Wallet"),
          tabBarIcon: ({ color }) => (
            <WalletIcon
              color={color}
              width={25}
              height={25}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: t("Earnings"),
          tabBarIcon: ({ color }) => (
            <CurrencyIcon
              color={color}
              width={25}
              height={25}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          headerTitle: t("Profile"),
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: appTheme.themeBackground },
          headerTitleStyle: { color: appTheme.fontMainColor },
          title: t("Profile"),
          tabBarIcon: ({ color }) => (
            <PersonIcon
              color={color}
              width={25}
              height={25}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default RootLayout;
