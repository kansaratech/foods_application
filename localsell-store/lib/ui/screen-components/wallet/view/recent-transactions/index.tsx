import { useApptheme } from "@/lib/context/theme.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { IStoreTransaction } from "@/lib/utils/interfaces/rider.interface";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Text, View } from "react-native";

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  TRANSFERRED: "cash-outline",
  PAID: "cash-sharp",
  CANCELLED: "remove-circle-outline",
  REQUESTED: "time-outline",
  PENDING: "time-outline",
};

const COLOR: Record<string, string> = {
  TRANSFERRED: "#16A34A",
  PAID: "#16A34A",
  CANCELLED: "#DC2626",
  REQUESTED: "#0EA5E9",
  PENDING: "#0EA5E9",
};

export default function RecentTransaction({
  transaction,
  isLast,
}: {
  transaction: IStoreTransaction;
  isLast: boolean;
}) {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { format } = useCurrency();

  const status = transaction.status ?? "";
  const accent = COLOR[status] ?? appTheme.fontMainColor;
  const date = transaction.createdAt ? new Date(transaction.createdAt) : null;

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 border-b ${
        isLast ? "mb-4" : ""
      }`}
      style={{
        backgroundColor: appTheme.themeBackground,
        borderColor: appTheme.borderLineColor,
      }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}1A` }}
        >
          <Ionicons
            size={18}
            name={ICON[status] ?? "swap-horizontal-outline"}
            color={accent}
          />
        </View>
        <View>
          <Text
            className="font-semibold"
            style={{ color: appTheme.fontMainColor }}
          >
            {t(status || "Transaction")}
          </Text>
          {!!date && (
            <Text
              className="text-xs mt-0.5"
              style={{ color: appTheme.fontSecondColor }}
            >
              {date.toDateString()}
            </Text>
          )}
        </View>
      </View>

      <Text className="font-bold" style={{ color: accent }}>
        {format(transaction?.amountTransferred ?? 0)}
      </Text>
    </View>
  );
}
