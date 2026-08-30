// Interfaces
import { IEarningStackProps } from "@/lib/utils/interfaces/earning.interface";
// SVG
import { RightArrowIcon } from "@/lib/ui/useable-components/svg";

import { useTranslation } from "react-i18next";

// Core
import { useApptheme } from "@/lib/context/theme.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { Text, TouchableOpacity, View } from "react-native";

export default function EarningStack({
  date,
  earning,
  setModalVisible,
  _id,
  earningsArray,
  totalDeliveries,
  totalOrderAmount,
  isLast,
}: IEarningStackProps) {
  // Hooks
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { format } = useCurrency();

  // Handlers
  function handleForwardPress() {
    setModalVisible({
      bool: true,
      _id: _id,
      date: date,
      earningsArray: earningsArray,
      totalEarningsSum: earning,
      totalDeliveries: totalDeliveries,
      totalOrderAmount: totalOrderAmount,
    });
  }

  return (
    <TouchableOpacity
      onPress={handleForwardPress}
      className="flex-row items-center justify-between px-4 py-4 border-b"
      style={{
        borderColor: appTheme.borderLineColor,
        backgroundColor: appTheme.themeBackground,
        marginBottom: isLast ? 24 : 0,
      }}
    >
      <View className="min-w-0 flex-1 pr-3">
        <Text
          className="text-xs"
          style={{ color: appTheme.fontSecondColor }}
          numberOfLines={1}
        >
          {date}
        </Text>
        <Text
          className="font-semibold mt-0.5"
          style={{ color: appTheme.fontMainColor }}
        >
          {t("Total Earnings")}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="font-bold" style={{ color: appTheme.linkColor }}>
          {format(earning, 0)}
        </Text>
        <RightArrowIcon color={appTheme.linkColor} />
      </View>
    </TouchableOpacity>
  );
}
