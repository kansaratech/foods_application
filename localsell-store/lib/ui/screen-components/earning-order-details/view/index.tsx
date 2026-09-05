// Contexts
import { useUserContext } from "@/lib/context/global/user.context";

// Interfaces
import { IFlatEarningOrder } from "@/lib/utils/interfaces/rider-earnings.interface";

// Components
import { NoRecordFound } from "@/lib/ui/useable-components";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { FlatList, View } from "react-native";
import OrderStack from "../order-stack";

// Hooks
import { useApptheme } from "@/lib/context/theme.context";
import { useMemo } from "react";

export default function EarningsOrderDetailsMain() {
  const { appTheme } = useApptheme();
  const { storeOrdersEarnings } = useUserContext();
  const tabBarHeight = useBottomTabBarHeight();

  // The API groups earnings by day, each day carrying a list of orders. Flatten
  // to one row per order (the old code read `day.orderDetails.orderId` — a field
  // that doesn't exist on the array — and crashed on `.substring` of undefined).
  const orders = useMemo<IFlatEarningOrder[]>(() => {
    const days = storeOrdersEarnings ?? [];
    return days
      .flatMap((day) => {
        const list = Array.isArray(day.orderDetails)
          ? day.orderDetails
          : [day.orderDetails].filter(Boolean);
        const perOrder =
          list.length > 0 ? Number(day.totalOrderAmount) / list.length : 0;
        return list
          .filter((od) => od && od.orderId)
          .map((od) => ({
            orderId: od.orderId,
            orderType: od.orderType,
            paymentMethod: od.paymentMethod,
            date: day.date,
            amount: perOrder,
          }));
      })
      .sort(
        (a, b) =>
          new Date(String(b.date)).getTime() -
          new Date(String(a.date)).getTime(),
      );
  }, [storeOrdersEarnings]);

  if (!orders.length) return <NoRecordFound />;

  return (
    <View style={{ backgroundColor: appTheme.themeBackground, flex: 1 }}>
      <FlatList
        data={orders}
        keyExtractor={(item, index) => `${item.orderId}-${index}`}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        ListEmptyComponent={<NoRecordFound />}
        renderItem={({ item, index }) => (
          <OrderStack
            isLast={index === orders.length - 1}
            amount={item.amount}
            orderId={item.orderId}
            date={item.date}
            paymentMethod={item.paymentMethod}
          />
        )}
      />
    </View>
  );
}
