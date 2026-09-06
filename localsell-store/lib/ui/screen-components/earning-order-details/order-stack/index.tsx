import { useApptheme } from "@/lib/context/theme.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { IStoreEarningsOrderProps } from "@/lib/utils/interfaces/rider-earnings.interface";
import { useTranslation } from "react-i18next";

import { Text, View } from "react-native";

export default function OrderStack({
  orderId,
  amount,
  date,
  paymentMethod,
  deliveryMode,
}: IStoreEarningsOrderProps) {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { format } = useCurrency();

  const shortId = orderId ? `#${String(orderId).slice(-8)}` : "—";
  const modeLabel =
    deliveryMode === "PICKUP"
      ? t("Pickup")
      : deliveryMode === "SELF"
        ? t("My delivery")
        : deliveryMode === "PLATFORM"
          ? t("LocalSell fleet")
          : null;

  return (
    <View
      className="flex-row items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: appTheme.borderLineColor }}
    >
      <View className="min-w-0 flex-1 pr-3">
        <Text
          className="font-semibold"
          style={{ color: appTheme.fontMainColor }}
          numberOfLines={1}
        >
          {t("Order ID")} {shortId}
        </Text>
        <Text
          className="text-xs mt-1"
          style={{ color: appTheme.fontSecondColor }}
        >
          {[date, paymentMethod, modeLabel].filter(Boolean).join(" · ")}
        </Text>
      </View>

      <View className="items-end">
        <View className="rounded-full bg-[#D1FAE5] px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-[#065F46]">
            {t("Completed")}
          </Text>
        </View>
        <Text
          className="font-bold mt-1"
          style={{ color: appTheme.fontMainColor }}
        >
          {format(amount)}
        </Text>
      </View>
    </View>
  );
}
