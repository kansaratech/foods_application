// Contexts
import { useUserContext } from "@/lib/context/global/user.context";
import { useApptheme } from "@/lib/context/theme.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";

// Interfaces
import { IEarningBottomProps } from "@/lib/utils/interfaces/earning.interface";

// Icons
import { Ionicons } from "@expo/vector-icons";

// Expo
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

// Core
import { Platform, Text, TouchableOpacity, View } from "react-native";

// React Native Modal
import ReactNativeModal from "react-native-modal";

const EMPTY = {
  bool: false,
  _id: "",
  date: "",
  earningsArray: [],
  totalEarningsSum: 0,
  totalDeliveries: 0,
  totalOrderAmount: 0,
};

export default function EarningBottomBar({
  totalEarnings,
  totalDeliveries,
  modalVisible,
  setModalVisible,
}: IEarningBottomProps) {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { setStoreOrderEarnings } = useUserContext();
  const isWeb = Platform.OS === "web";

  const close = () => setModalVisible(EMPTY);

  const openOrderDetails = () => {
    setStoreOrderEarnings(modalVisible.earningsArray);
    router.push({
      pathname:
        "/(protected)/(tabs)/earnings/(routes)/earnings-order-details",
    });
    close();
  };

  return (
    <ReactNativeModal
      isVisible={modalVisible.bool}
      onBackdropPress={close}
      onBackButtonPress={close}
      useNativeDriver
      backdropOpacity={0.45}
      animationIn={isWeb ? "fadeIn" : "slideInUp"}
      animationOut={isWeb ? "fadeOut" : "slideOutDown"}
      style={{
        margin: 0,
        justifyContent: isWeb ? "center" : "flex-end",
        alignItems: "center",
      }}
    >
      <View
        style={{
          backgroundColor: appTheme.themeBackground,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
          elevation: 12,
        }}
        className={`w-[92%] max-w-[420px] ${
          isWeb ? "rounded-3xl" : "w-full rounded-t-3xl"
        }`}
      >
        <View
          className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b"
          style={{ borderColor: appTheme.borderLineColor }}
        >
          <Text
            className="text-lg font-bold"
            style={{ color: appTheme.fontMainColor }}
          >
            {t("Earnings")}
          </Text>
          <TouchableOpacity onPress={close} accessibilityLabel={t("Close")}>
            <Ionicons
              name="close-circle-outline"
              size={24}
              color={appTheme.fontSecondColor}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between px-5 py-4">
          <Text
            className="font-semibold"
            style={{ color: appTheme.fontSecondColor }}
          >
            {t("Total Earning")}
          </Text>
          <Text
            className="text-base font-bold"
            style={{ color: appTheme.fontMainColor }}
          >
            {format(totalEarnings)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={openOrderDetails}
          className="flex-row items-center justify-between px-5 py-4 border-t"
          style={{ borderColor: appTheme.borderLineColor }}
        >
          <Text
            className="font-semibold"
            style={{ color: appTheme.linkColor }}
          >
            {t("Deliveries")} ({totalDeliveries})
          </Text>
          <View className="flex-row items-center gap-2">
            <Text
              className="font-bold"
              style={{ color: appTheme.linkColor }}
            >
              {format(totalEarnings)}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={appTheme.linkColor}
            />
          </View>
        </TouchableOpacity>
      </View>
    </ReactNativeModal>
  );
}
