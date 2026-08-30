// GraphQL
import { STORE_EARNINGS_GRAPH } from "@/lib/apollo/queries/earnings.query";

// Hooks
import { useUserContext } from "@/lib/context/global/user.context";
import { QueryResult, useQuery } from "@apollo/client";

// Components
import SpinnerComponent from "@/lib/ui/useable-components/spinner";

// Interfacs
import { IStoreEarningsResponse } from "@/lib/utils/interfaces/rider-earnings.interface";

// Core
import { useApptheme } from "@/lib/context/theme.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

export default function EarningDetailsHeader() {
  // States
  const [storeEarningsGrandTotal, setStoreEarningsGrandTotal] = useState({
    earnings: 0,
    totalDeliveries: 0,
  });

  // Hooks
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { userId } = useUserContext();

  // Queries
  const { loading: isRiderEarningsLoading, data: riderEarningsData } = useQuery(
    STORE_EARNINGS_GRAPH,
    {
      variables: {
        storeId: userId ?? "",
      },
    },
  ) as QueryResult<IStoreEarningsResponse | undefined, { storeId: string }>;

  useEffect(() => {
    if (riderEarningsData?.storeEarningsGraph?.earnings?.length) {
      const totalEarnings =
        riderEarningsData?.storeEarningsGraph?.earnings?.reduce(
          (acc, curr) => acc + curr.totalEarningsSum,
          0,
        );
      const totalDeliveries =
        riderEarningsData?.storeEarningsGraph.earnings.reduce(
          (acc, curr) => acc + curr.earningsArray.length,
          0,
        );
      setStoreEarningsGrandTotal({
        earnings: totalEarnings,
        totalDeliveries: totalDeliveries,
      });
    }
  }, []);

  if (isRiderEarningsLoading) return <SpinnerComponent />;
  return (
    <View
      className="px-4 py-4 border-b"
      style={{
        backgroundColor: appTheme.themeBackground,
        borderColor: appTheme.borderLineColor,
      }}
    >
      <Text
        className="text-lg font-bold mb-3"
        style={{ color: appTheme.fontMainColor }}
      >
        {t("Summary")}
      </Text>

      <View className="flex-row gap-3">
        <View
          className="flex-1 rounded-2xl p-4"
          style={{ backgroundColor: appTheme.sidebarIconBackground }}
        >
          <Text
            className="text-xs font-semibold uppercase"
            style={{ color: appTheme.fontSecondColor }}
          >
            {t("Total Earnings")}
          </Text>
          <Text
            className="text-2xl font-bold mt-1"
            style={{ color: appTheme.fontMainColor }}
          >
            {format(storeEarningsGrandTotal.earnings)}
          </Text>
        </View>

        <View
          className="flex-1 rounded-2xl p-4"
          style={{ backgroundColor: appTheme.sidebarIconBackground }}
        >
          <Text
            className="text-xs font-semibold uppercase"
            style={{ color: appTheme.fontSecondColor }}
          >
            {t("Total Deliveries")}
          </Text>
          <Text
            className="text-2xl font-bold mt-1"
            style={{ color: appTheme.fontMainColor }}
          >
            {storeEarningsGrandTotal.totalDeliveries}
          </Text>
        </View>
      </View>
    </View>
  );
}
