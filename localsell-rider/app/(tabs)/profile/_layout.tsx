// Expo
import { useApptheme } from "@/lib/context/global/theme.context";
import { Stack } from "expo-router";

// Hooks
import { useTranslation } from "react-i18next";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileLayout() {
  // Hooks
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: Platform.OS === "web" ? 0 : top + 10,
        flex: 1,
        backgroundColor: appTheme.themeBackground,
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: appTheme.themeBackground },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: Platform.OS !== "web",
            headerTitleAlign: "center",
            headerTitle: t("Profile"),
            headerTitleStyle: { color: appTheme.mainTextColor },
            headerStyle: { backgroundColor: appTheme.themeBackground },
          }}
        />
      </Stack>
    </View>
  );
}
