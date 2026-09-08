import { AuthContext } from "@/lib/context/global/auth.context";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import { Redirect, Tabs, usePathname } from "expo-router";
import { Platform } from "react-native";

// UI Components
import { HapticTab } from "@/lib/ui/useable-components/HapticTab";
import {
  CurrencyIcon,
  HomeIcon,
  PersonIcon,
  WalletIcon,
} from "@/lib/ui/useable-components/svg";

// Hooks
import { useApptheme } from "@/lib/context/global/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const RootLayout = () => {
  // States
  const [tabKey, setTabKey] = useState(1);

  // Hooks
  const pathName = usePathname();
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const { token, isAuthReady } = useContext(AuthContext);
  const { dataProfile, loadingProfile } = useUserContext();

  useEffect(() => {
    if (pathName.startsWith("/wallet/success")) {
      setTabKey((prev) => prev + 1); // Force a re-render of the tab bar
    }
  }, [pathName]);

  if (!isAuthReady) {
    return <SpinnerComponent />;
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  // A rider who isn't approved yet (or was rejected) can't use the app — the
  // API refuses to let them go online or take orders anyway. Wait for the
  // profile to load so we don't bounce an approved rider on a slow network.
  const approval = dataProfile?.approvalStatus;
  if (!loadingProfile && approval && approval !== "APPROVED") {
    return <Redirect href="/pending-approval" />;
  }

  return (
    <Tabs
      key={tabKey}
      screenOptions={{
        tabBarActiveTintColor: appTheme.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
            backgroundColor: "#1F2937",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 0.5, // Optional border at the top
            shadowColor: "#000", // Shadow for iOS
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            // display: isDrawerOpen === 'open' ? 'none' : 'flex',
          },
          android: {
            // Not absolutely positioned so screen content never renders behind
            // the bar and @react-navigation adds the bottom safe-area inset
            // automatically (SafeAreaProvider is mounted at the app root).
            backgroundColor: "#1F2937",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 0.5,
            elevation: 5,
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          href: "/(tabs)/home/orders",

          title: t("Home"),
          tabBarIcon: ({ color }) => (
            // <IconSymbol size={28} name="home" color={color} />
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
          title: t("Profile"),
          headerShown: false,
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
