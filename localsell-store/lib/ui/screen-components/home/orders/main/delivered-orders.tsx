import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
// UI
import CustomTab from "@/lib/ui/useable-components/custom-tab";
import OrderLoader from "@/lib/ui/useable-components/order-loader";
// Constants
import { NO_ORDER_PROMPT, ORDER_DISPATCH_TYPE } from "@/lib/utils/constants";

// Interface
import { IOrderTabsComponentProps } from "@/lib/utils/interfaces";
import { IOrder } from "@/lib/utils/interfaces/order.interface";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

// Hook
import { useApptheme } from "@/lib/context/theme.context";
import useOrders from "@/lib/hooks/useOrders";
import Order from "@/lib/ui/useable-components/order";
import { WalletIcon } from "@/lib/ui/useable-components/svg";
import { ORDER_TYPE } from "@/lib/utils/types";
import useSafeKeepAwake from "@/lib/hooks/useSafeKeepAwake";
import { useTranslation } from "react-i18next";

function HomeDeliveredOrdersMain(props: IOrderTabsComponentProps) {
  // Props
  const { route } = props;

  // Hooks
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { loading, deliveredOrders, refetch, currentTab, setCurrentTab } =
    useOrders();
  useSafeKeepAwake();

  // const { loading: mutateLoading } = useAcceptOrder();

  // States
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Handlers
  const orders = useMemo(
    () =>
      deliveredOrders.filter((order) =>
        currentTab === ORDER_DISPATCH_TYPE[0]
          ? !order?.isPickedUp
          : order?.isPickedUp,
      ),
    [currentTab, deliveredOrders],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleShowDetails = useCallback((itemId: string) => {
    setShowDetails((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const renderOrderItem = useCallback(
    ({ item }: { item: IOrder }) => (
      <Order
        tab={route.key as ORDER_TYPE}
        order={item}
        showDetails={showDetails}
        onToggleDetails={toggleShowDetails}
      />
    ),
    [route.key, showDetails, toggleShowDetails],
  );

  const renderEmptyState = () => (
    <View
      className="self-stretch items-center justify-center rounded-3xl border px-8 py-12"
      style={{
        borderColor: appTheme.borderLineColor,
        backgroundColor: appTheme.cartContainer,
        marginTop: 40,
      }}
    >
      <View
        className="h-20 w-20 items-center justify-center rounded-full mb-5"
        style={{ backgroundColor: appTheme.lowOpacityPrimaryColor }}
      >
        <WalletIcon height={44} width={44} color={appTheme.primary} />
      </View>

      {orders?.length === 0 ? (
        <Text
          className="font-[Inter] text-[18px] text-base font-[500]"
          style={{ color: appTheme.fontSecondColor }}
        >
          {t(NO_ORDER_PROMPT[route.key])}
        </Text>
      ) : (
        <Text style={{ color: appTheme.fontMainColor }}>
          {t("Pull down to refresh")}
        </Text>
      )}
    </View>
  );

  return (
    <View
      className="flex-1 items-center px-5"
      style={[style.container, { backgroundColor: appTheme.themeBackground, paddingTop: 60 }]}
    >
      <CustomTab
        options={ORDER_DISPATCH_TYPE}
        selectedTab={currentTab}
        setSelectedTab={setCurrentTab}
        deliveryCount={
          deliveredOrders?.filter((o) => !o.isPickedUp).length ?? 0
        }
        pickupCount={deliveredOrders?.filter((o) => !!o.isPickedUp).length ?? 0}
      />

      <View className="flex-1 w-full lg:max-w-4xl lg:self-center">
        {loading && (!orders || orders?.length < 1) ? (
          <OrderLoader label={t("Loading delivered orders")} />
        ) : orders?.length > 0 ? (
          <FlatList
            className="w-full"
            contentContainerStyle={[
              style.listContent,
              { paddingBottom: tabBarHeight + 24 },
            ]}
            keyExtractor={(item) => item._id}
            data={orders}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            initialNumToRender={20} // render more items up front
            maxToRenderPerBatch={20} // reduce batching delays
            windowSize={5} // keep more items around viewport
            renderItem={renderOrderItem}
            ListEmptyComponent={renderEmptyState}
          />
        ) : (
          renderEmptyState()
        )}
      </View>
    </View>
  );
}

export default HomeDeliveredOrdersMain;

const style = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    paddingBottom: 16,
  },
});
