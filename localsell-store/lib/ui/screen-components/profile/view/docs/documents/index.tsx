import { useUserContext } from "@/lib/context/global/user.context";
import { useApptheme } from "@/lib/context/theme.context";
import { app_theme } from "@/lib/utils/types/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Switch } from "react-native-switch";

export default function DocumentsSection() {
  const { appTheme, currentTheme, toggleTheme } = useApptheme();
  const { t } = useTranslation();
  const { dataProfile } = useUserContext();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const hasBusinessDetails = !!dataProfile?.hasBusinessDetails;

  const details = [
    { icon: "location-outline", label: t("Address"), value: dataProfile?.address },
    { icon: "call-outline", label: t("Phone"), value: dataProfile?.phone },
    { icon: "person-outline", label: t("Username"), value: dataProfile?.username },
  ] as const;

  const cardStyle = {
    backgroundColor: appTheme.cartContainer,
    borderColor: appTheme.borderLineColor,
  };

  return (
    <View className={isDesktop ? "flex-row gap-5" : "gap-y-5"}>
      <View className="flex-1 gap-y-5">
        <View className="rounded-3xl border p-6" style={cardStyle}>
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center flex-1">
              <View
                className="h-11 w-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: appTheme.lowOpacityPrimaryColor }}
              >
                <Ionicons name="card-outline" size={21} color={appTheme.primary} />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-lg font-bold" style={{ color: appTheme.fontMainColor }}>
                  {t("Bank Details")}
                </Text>
                <Text className="text-sm mt-1" style={{ color: appTheme.fontSecondColor }}>
                  Required for settlements and withdrawals
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/bank-management")}
              className="rounded-xl px-4 py-2"
              style={{ backgroundColor: appTheme.primary }}
            >
              <Text className="font-semibold text-white">
                {hasBusinessDetails ? t("Update") : t("Add")}
              </Text>
            </TouchableOpacity>
          </View>
          <View
            className="self-start flex-row items-center rounded-full px-3 py-2 mt-5"
            style={{ backgroundColor: hasBusinessDetails ? "#DCFCE7" : "#FEE2E2" }}
          >
            <Ionicons
              name={hasBusinessDetails ? "checkmark-circle" : "alert-circle"}
              size={16}
              color={hasBusinessDetails ? "#15803D" : "#B91C1C"}
            />
            <Text
              className="text-sm font-semibold ml-2"
              style={{ color: hasBusinessDetails ? "#15803D" : "#B91C1C" }}
            >
              {hasBusinessDetails ? t("Details submitted") : t("Details required")}
            </Text>
          </View>
        </View>

        <View className="rounded-3xl border p-6" style={cardStyle}>
          <Text className="text-lg font-bold mb-4" style={{ color: appTheme.fontMainColor }}>
            Appearance
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View
                className="h-11 w-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: appTheme.sidebarIconBackground }}
              >
                <Ionicons
                  name={currentTheme === "dark" ? "moon" : "sunny"}
                  size={21}
                  color={appTheme.primary}
                />
              </View>
              <View className="ml-4">
                <Text className="font-semibold" style={{ color: appTheme.fontMainColor }}>
                  {currentTheme === "dark" ? "Dark theme" : "Light theme"}
                </Text>
                <Text className="text-sm mt-1" style={{ color: appTheme.fontSecondColor }}>
                  Choose the interface that feels best
                </Text>
              </View>
            </View>
            <Switch
              value={currentTheme === "dark"}
              onValueChange={() => toggleTheme(currentTheme as app_theme)}
              activeText=""
              inActiveText=""
              circleSize={24}
              barHeight={28}
              backgroundActive={appTheme.primary}
              backgroundInactive={appTheme.gray}
              circleBorderWidth={0}
            />
          </View>
        </View>
      </View>

      <View className="flex-1 rounded-3xl border p-6" style={cardStyle}>
        <Text className="text-lg font-bold" style={{ color: appTheme.fontMainColor }}>
          Restaurant details
        </Text>
        <Text className="text-sm mt-1 mb-5" style={{ color: appTheme.fontSecondColor }}>
          Contact information visible to your team
        </Text>
        {details.map((detail, index) => (
          <View
            key={detail.label}
            className="flex-row items-center py-4"
            style={{
              borderBottomWidth: index === details.length - 1 ? 0 : 1,
              borderBottomColor: appTheme.borderLineColor,
            }}
          >
            <View
              className="h-10 w-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: appTheme.sidebarIconBackground }}
            >
              <Ionicons name={detail.icon} size={19} color={appTheme.iconColor} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
                {detail.label}
              </Text>
              <Text
                className="text-sm font-semibold mt-1"
                style={{ color: detail.value ? appTheme.fontMainColor : appTheme.textErrorColor }}
                numberOfLines={2}
              >
                {detail.value || t("Not provided")}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
