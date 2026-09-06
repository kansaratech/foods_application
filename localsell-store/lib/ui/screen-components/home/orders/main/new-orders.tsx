import { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import PreparationTimeDialog from "@/lib/ui/useable-components/preparation-time-dialog";
// UI
import CustomTab from "@/lib/ui/useable-components/custom-tab";
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
import SetTimeScreenAndAcceptOrder from "@/lib/ui/useable-components/set-order-accept-time";
import { WalletIcon } from "@/lib/ui/useable-components/svg";
import { ORDER_TYPE } from "@/lib/utils/types";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import ResponsiveFormSheet, {
  ResponsiveFormSheetHandle,
} from "@/lib/ui/useable-components/responsive-form-sheet";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import OrderLoader from "@/lib/ui/useable-components/order-loader";
import useSafeKeepAwake from "@/lib/hooks/useSafeKeepAwake";

function HomeNewOrdersMain(props: IOrderTabsComponentProps) {
  // Props
  const { route } = props;

  // Hooks
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { loading, activeOrders, refetch, currentTab, setCurrentTab } =
    useOrders();
  useSafeKeepAwake();

  // Ref
  const bottomSheetModalRef = useRef<ResponsiveFormSheetHandle>(null);

  // States
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  // Printer States

  //////////

  const orders = useMemo(
    () =>
      activeOrders.filter((order) =>
        currentTab === ORDER_DISPATCH_TYPE[0]
          ? !order?.isPickedUp
          : order?.isPickedUp,
      ),
    [activeOrders, currentTab],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePresentModalPress = useCallback((order: IOrder) => {
    setSelectedOrder(order);
    bottomSheetModalRef.current?.present();
  }, []);

  const handleDismissModal = useCallback(() => {
    setSelectedOrder(null);
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const toggleShowDetails = useCallback((itemId: string) => {
    setShowDetails((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const renderOrderItem = useCallback(
    ({ item }: { item: IOrder }) => (
      <Order
        tab={route.key as ORDER_TYPE}
        order={item}
        handlePresentModalPress={handlePresentModalPress}
        showDetails={showDetails}
        onToggleDetails={toggleShowDetails}
      />
    ),
    [handlePresentModalPress, route.key, showDetails, toggleShowDetails],
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
        <Text className="font-[Inter] text-lg font-semibold text-gray-700">
          {t(NO_ORDER_PROMPT[route.key])}
        </Text>
      ) : (
        <Text>{t("Pull down to refresh")}</Text>
      )}
    </View>
  );
  return (
    <GestureHandlerRootView style={style.gestureContainer}>
      <BottomSheetModalProvider>
        <View
          className="flex-1 items-center px-5"
          style={[
            style.container,
            { backgroundColor: appTheme.themeBackground, paddingTop: 60 },
          ]}
        >
          <CustomTab
            options={ORDER_DISPATCH_TYPE}
            deliveryCount={
              activeOrders?.filter((o) => !o.isPickedUp).length ?? 0
            }
            pickupCount={
              activeOrders?.filter((o) => !!o.isPickedUp).length ?? 0
            }
            selectedTab={currentTab}
            setSelectedTab={setCurrentTab}
          />

          <View className="flex-1 w-full lg:max-w-4xl lg:self-center">
            {loading && (!orders || orders?.length < 1) ? (
              <OrderLoader label={t("Loading new orders")} />
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

        {Platform.OS === "web" ? (
          selectedOrder && (
            <PreparationTimeDialog
              key={selectedOrder._id}
              order={selectedOrder}
              onClose={handleDismissModal}
            />
          )
        ) : (
          <ResponsiveFormSheet ref={bottomSheetModalRef} maxWidth={420}>
            {selectedOrder?._id && (
              <SetTimeScreenAndAcceptOrder
                id={selectedOrder?._id ?? ""}
                orderId={selectedOrder?.orderId ?? ""}
                handleDismissModal={handleDismissModal}
              />
            )}
          </ResponsiveFormSheet>
        )}
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

export default HomeNewOrdersMain;

const style = StyleSheet.create({
  container: { flex: 1 },
  gestureContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 30,
  },
  listContent: {
    paddingBottom: 16,
  },
});
