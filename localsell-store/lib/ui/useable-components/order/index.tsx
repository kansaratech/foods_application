import { useSubscription } from "@apollo/client";
import { ConfigurationContext } from "@/lib/context/global/configuration.context";
import { SUBSCRIPTION_ORDER } from "@/lib/apollo/subscriptions";
import { MAX_TIME } from "@/lib/utils/constants";
import { IOrder } from "@/lib/utils/interfaces/order.interface";
import { orderSubTotal } from "@/lib/utils/methods";
import { getIsAcceptButtonVisible } from "@/lib/utils/methods/global";
import { ORDER_TYPE } from "@/lib/utils/types";
import { memo, useContext, useEffect, useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import CountdownTimer from "../custom-timer";
import SpinnerComponent from "../spinner";
import { preparationDeadline } from "@/lib/utils/methods/preparation-deadline";

// Hooks
import { useSoundContext } from "@/lib/context/global/sound.context";
import { useApptheme } from "@/lib/context/theme.context";
import useCancelOrder from "@/lib/hooks/useCancelOrder";
import useOrderPickedUp from "@/lib/hooks/useOrderPickedUp";
import { useTranslation } from "react-i18next";
import OrderDispatch, {
  DeliveryModeBadge,
} from "@/lib/ui/screen-components/home/orders/dispatch";

interface IOrderProps {
  order: IOrder;
  tab: ORDER_TYPE;
  handlePresentModalPress?: (order: IOrder) => void;
  showDetails: Record<string, boolean>;
  onToggleDetails: (itemId: string) => void;
}

const OrderThumbnail = ({ uri, title }: { uri?: string; title?: string }) => {
  const [failed, setFailed] = useState(false);
  const { appTheme } = useApptheme();
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? (
    <Image
      source={{ uri }}
      accessibilityLabel={title}
      resizeMode="cover"
      onError={() => setFailed(true)}
      style={{ width: 64, height: 64 }}
    />
  ) : (
    <Text
      accessibilityLabel={title}
      style={{ color: appTheme.primary, fontWeight: "700", fontSize: 20 }}
    >
      {title?.trim().charAt(0).toUpperCase() || "?"}
    </Text>
  );
};

const didOrderDetailVisibilityChange = (
  prevShowDetails: Record<string, boolean>,
  nextShowDetails: Record<string, boolean>,
  order: IOrder,
) =>
  order.items?.some(
    (item) => prevShowDetails[item._id] !== nextShowDetails[item._id],
  ) ?? false;

const Order = ({
  order,
  tab,
  handlePresentModalPress,
  showDetails = {},
  onToggleDetails,
}: IOrderProps) => {
  const { appTheme, currentTheme } = useApptheme();
  const secondaryText =
    currentTheme === "dark" ? appTheme.fontSecondColor : "#64748b";
  const { silenceRing } = useSoundContext();
  const configuration = useContext(ConfigurationContext);
  const { t } = useTranslation();
  const { cancelOrder, loading: loadingCancelOrder } = useCancelOrder();
  const { pickedUp, loading: loadingPicked } = useOrderPickedUp();

  // Keep this order's status live in real time. The subscription result is
  // written into the normalized cache (keyed by _id), so orderStatus/isPickedUp
  // update here without waiting for a refetch or the 60s poll.
  useSubscription(SUBSCRIPTION_ORDER, {
    variables: { id: order?._id },
    skip: !order?._id,
  });

  // Ref
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // States
  const [isAcceptButtonVisible, setIsAcceptButtonVisible] = useState(
    getIsAcceptButtonVisible(order?.orderDate ?? ""),
  );

  // Timer
  const timeNow = new Date();
  const acceptanceTime = Math.floor(
    ((order ? new Date(order.orderDate).getTime() : 0) - timeNow.getTime()) /
      1000,
  );
  let remainingTime = Math.floor(
    ((order ? new Date(order.createdAt).getTime() : 0) +
      MAX_TIME * 1000 -
      timeNow.getTime()) /
      1000,
  );

  const prepDeadline = preparationDeadline(
    order.preparationTime,
    order.acceptedAt,
  );

  const decision = !isAcceptButtonVisible
    ? acceptanceTime
    : remainingTime > 0
      ? remainingTime
      : 0;

  if (decision === acceptanceTime) {
    remainingTime = 0;
  }

  // Handlers
  const onCancelOrderHandler = async () => {
    await silenceRing();
    await cancelOrder(order._id, "not available");
  };

  const onPickupOrder = () => {
    pickedUp(order._id);
  };

  // Use Effects
  useEffect(() => {
    if (!order) return;

    let isSubscribed = true;
    (() => {
      timer.current = setInterval(() => {
        const isAcceptButtonVisible = getIsAcceptButtonVisible(order.orderDate);
        if (isSubscribed) {
          setIsAcceptButtonVisible(isAcceptButtonVisible);
        }
        if (isAcceptButtonVisible) {
          if (timer.current) clearInterval(timer.current);
        }
      }, 10000);
    })();
    return () => {
      if (timer.current) clearInterval(timer.current);
      isSubscribed = false;
    };
  }, [order.orderDate]);

  if (!order || !configuration) {
    return null;
  }

  return (
    <View className="w-full">
      <View
        className="gap-y-4 rounded-2xl mx-0 my-2 p-5"
        style={{
          backgroundColor:
            currentTheme === "dark" ? appTheme.themeBackground : "#ffffff",
          borderWidth: 1,
          borderColor:
            currentTheme === "dark" ? appTheme.borderLineColor : "#e2e8f0",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 5 }}>
            <Text
              style={{ color: secondaryText, fontSize: 12, fontWeight: "500" }}
            >
              {t("Order ID")}
            </Text>
            <Text
              style={{
                color: appTheme.fontMainColor,
                fontSize: 19,
                fontWeight: "700",
              }}
            >
              #{order.orderId}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                tab === "delivered"
                  ? "#eff6ff"
                  : tab === "processing"
                    ? "#fff7ed"
                    : "#ecfdf5",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  tab === "delivered"
                    ? "#1d4ed8"
                    : tab === "processing"
                      ? "#b45309"
                      : "#15803d",
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color:
                  tab === "delivered"
                    ? "#1d4ed8"
                    : tab === "processing"
                      ? "#92400e"
                      : "#166534",
              }}
            >
              {t(order.orderStatus ?? "")}
            </Text>
          </View>
        </View>

        {["ACCEPTED", "ASSIGNED"].includes(order.orderStatus ?? "") && (
          <CountdownTimer deadline={prepDeadline} />
        )}

        {/* Fulfilment */}
        <DeliveryModeBadge order={order} />

        {/* Order Items */}
        <View className="flex-row justify-between items-center">
          <Text
            style={{
              color: secondaryText,
              fontSize: 14,
              fontWeight: "bold",
            }}
          >
            {t("ORDER")}
          </Text>
          <Text
            style={{
              color: secondaryText,
              fontSize: 14,
              fontWeight: "bold",
            }}
          >
            {t("PRICE")}
          </Text>
        </View>

        <View>
          {order?.items?.filter(Boolean).map((item) => {
            // Ensure variation is an object, default to empty if undefined.
            const variation = item.variation || {};
            const itemPrice = variation.price ?? 0;
            const itemTotal = itemPrice * (item.quantity ?? 1);

            return (
              <View
                key={item._id}
                className="flex-row justify-between items-start mb-3 mt-1"
              >
                {/* Left Side: Image and Details */}
                <View className="flex-row gap-x-3 flex-1">
                  {/* Image */}
                  <View
                    className="w-16 h-16 rounded-xl overflow-hidden items-center justify-center"
                    style={{
                      backgroundColor: appTheme.lowOpacityPrimaryColor,
                    }}
                  >
                    <OrderThumbnail uri={item.image} title={item.title} />
                  </View>

                  {/* Item Details */}
                  <View className="flex-1 justify-between">
                    <View>
                      <Text
                        style={{
                          color: appTheme.fontMainColor,
                          fontSize: 14,
                          fontWeight: "600",
                        }}
                      >
                        {`${item?.quantity}x ${item?.title}`}
                      </Text>
                      <Text
                        style={{
                          color: secondaryText,
                          fontSize: 12,
                        }}
                      >
                        {item?.description}
                      </Text>
                      {!!item?.specialInstructions && (
                        <Text
                          style={{
                            color: secondaryText,
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {item.specialInstructions}
                        </Text>
                      )}
                    </View>

                    {/* Toggle and Collapsible Details */}
                    <View className="mt-2">
                      {(variation.title ||
                        (item?.addons && item?.addons.length > 0)) && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityState={{
                            expanded: !!showDetails[item._id],
                          }}
                          onPress={() => onToggleDetails(item._id)}
                          className="flex-row items-center mb-2"
                        >
                          <Text
                            style={{
                              color: appTheme.primary,
                              fontSize: 12,
                              fontWeight: "500",
                            }}
                          >
                            {showDetails[item._id]
                              ? t("Hide Details")
                              : t("Show Details")}
                          </Text>
                          <View className="ml-1">
                            <Text
                              style={{ color: appTheme.primary, fontSize: 10 }}
                            >
                              {showDetails[item._id] ? "▲" : "▼"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {showDetails[item._id] && (
                        <View>
                          {variation.title && (
                            <View className="mb-2">
                              <View className="flex-row items-center">
                                <Text
                                  style={{
                                    color: secondaryText,
                                    fontSize: 12,
                                    fontWeight: "500",
                                  }}
                                >
                                  {variation.title}
                                </Text>
                                <Text
                                  className="ml-2"
                                  style={{
                                    color: appTheme.fontMainColor,
                                    fontSize: 12,
                                    fontWeight: "600",
                                  }}
                                >
                                  {`${configuration?.currencySymbol}${variation.price}`}
                                </Text>
                              </View>
                            </View>
                          )}

                          {item?.addons?.map((addon) => (
                            <View key={addon._id} className="mb-1">
                              {addon?.options?.map((option) => (
                                <View
                                  key={option._id}
                                  className="flex-row items-center"
                                >
                                  <Text
                                    style={{
                                      color: secondaryText,
                                      fontSize: 12,
                                    }}
                                  >
                                    {(option.quantity ?? 1) > 1
                                      ? `${option.quantity}x ${option.title}`
                                      : option.title}
                                  </Text>
                                  <Text
                                    className="ml-2"
                                    style={{
                                      color: appTheme.fontMainColor,
                                      fontSize: 12,
                                    }}
                                  >
                                    {`(+${configuration?.currencySymbol}${(
                                      (option?.price ?? 0) *
                                      (option.quantity ?? 1)
                                    ).toFixed(2)})`}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Right Side: Price */}
                <View className="w-auto items-end pl-3">
                  <Text
                    style={{ color: appTheme.fontMainColor, fontWeight: "600" }}
                  >
                    {`${configuration?.currencySymbol}${itemTotal.toFixed(2)}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderColor:
              currentTheme === "dark" ? appTheme.borderLineColor : "#e2e8f0",
            padding: 14,
            borderRadius: 12,
            backgroundColor:
              currentTheme === "dark" ? appTheme.cartContainer : "#f8fafc",
            marginTop: 4,
            gap: 8,
          }}
        >
          {[
            { label: "Sub Total", value: orderSubTotal(order) },
            { label: "Tip", value: order.tipping },
            { label: "Tax", value: order.taxationAmount },
            ...(order.discountAmount > 0
              ? [{ label: "discountAmount", value: order.discountAmount }]
              : []),
            ...(!order.isPickedUp
              ? [{ label: "Delivery Charges", value: order.deliveryCharges }]
              : []),
          ].map((row) => (
            <View
              key={row.label}
              className="flex-row justify-between items-center"
            >
              <Text style={{ color: secondaryText, fontSize: 14 }}>
                {t(row.label)}
              </Text>
              <Text
                style={{
                  color: appTheme.fontMainColor,
                  fontSize: 14,
                  fontWeight: "500",
                }}
              >
                {configuration.currencySymbol}
                {Number(row.value || 0).toFixed(2)}
              </Text>
            </View>
          ))}
          <View
            className="flex-row justify-between items-center"
            style={{
              borderTopWidth: 1,
              borderColor: appTheme.borderLineColor,
              paddingTop: 12,
              marginTop: 2,
            }}
          >
            <Text
              style={{
                color: appTheme.fontMainColor,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              {t("Total")}
            </Text>
            <Text
              style={{
                color: appTheme.fontMainColor,
                fontSize: 20,
                fontWeight: "700",
              }}
            >
              {configuration.currencySymbol}
              {Number(order.orderAmount || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Order Instructions */}
        {order?.instructions && (
          <View className="py-2">
            <Text
              style={{
                color: appTheme.primary,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              {t("Special Instructions")}
            </Text>
            <Text
              style={{
                color: appTheme.fontMainColor,
                fontSize: 16,
                fontWeight: "400",
                fontStyle: "italic",
                marginTop: 4,
              }}
            >
              {order?.instructions}
            </Text>
          </View>
        )}

        {/* New Order */}
        {order?.orderStatus === "PENDING" && (
          <View>
            <View className="flex-row gap-x-3 w-full mt-4">
              {/* Decline */}
              <TouchableOpacity
                className="flex-1 h-12 items-center justify-center rounded-xl"
                style={{ borderWidth: 1, borderColor: "#ef4444" }}
                accessibilityRole="button"
                disabled={loadingCancelOrder}
                accessibilityState={{ disabled: loadingCancelOrder }}
                onPress={() => onCancelOrderHandler()}
              >
                {loadingCancelOrder ? (
                  <SpinnerComponent color="#ef4444" />
                ) : (
                  <Text
                    style={{
                      color: "#ef4444",
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {t("Decline")}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Accept */}
              {handlePresentModalPress && (
                <TouchableOpacity
                  className="flex-1 h-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: appTheme.primary,
                    borderWidth: 1,
                    borderColor: appTheme.primary,
                  }}
                  accessibilityRole="button"
                  onPress={() => handlePresentModalPress(order)}
                >
                  <Text
                    style={{
                      color: appTheme.white,
                      fontSize: 15,
                      fontWeight: "600",
                    }}
                  >
                    {t("Accept")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Processing */}
        {["ACCEPTED", "ASSIGNED", "PICKED"].includes(
          order?.orderStatus ?? "",
        ) && (
          <>
            <OrderDispatch order={order} />

            {order.orderStatus === "ASSIGNED" && (
              <View className="flex-row gap-x-3 w-full mt-4">
                {/* Hand Order to Rider */}
                {/* <TouchableOpacity
                  className="flex-1 h-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: appTheme.primary,
                    borderWidth: 1,
                    borderColor: appTheme.primary,
                  }}
                  onPress={() => onPickupOrder()}
                >
                  {loadingPicked ? (
                    <SpinnerComponent color={appTheme.white} />
                  ) : (
                    <Text
                      style={{
                        color: appTheme.white,
                        fontSize: 18,
                        fontWeight: "500",
                      }}
                    >
                      {t("Hand Order to Rider")}
                    </Text>
                  )}
                </TouchableOpacity> */}
              </View>
            )}
            {order.orderStatus === "ACCEPTED" && order.isPickedUp && (
              <View className="flex-row gap-x-3 w-full mt-4">
                {/* Hand Order to Rider */}
                <TouchableOpacity
                  className="flex-1 h-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: appTheme.primary,
                    borderWidth: 1,
                    borderColor: appTheme.primary,
                  }}
                  onPress={() => onPickupOrder()}
                >
                  {loadingPicked ? (
                    <SpinnerComponent color={appTheme.white} />
                  ) : (
                    <Text
                      style={{
                        color: appTheme.white,
                        fontSize: 18,
                        fontWeight: "500",
                      }}
                    >
                      {t("Deliver Order to Customer")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

export default memo(Order, (prevProps, nextProps) => {
  if (prevProps.tab !== nextProps.tab) return false;
  if (prevProps.order._id !== nextProps.order._id) return false;
  if (prevProps.order.updatedAt !== nextProps.order.updatedAt) return false;
  if (prevProps.order.orderStatus !== nextProps.order.orderStatus) return false;
  if (prevProps.order.isPickedUp !== nextProps.order.isPickedUp) return false;
  if (prevProps.order.preparationTime !== nextProps.order.preparationTime) {
    return false;
  }
  if (
    prevProps.order.storeDeliveryAgent?._id !==
    nextProps.order.storeDeliveryAgent?._id
  ) {
    return false;
  }
  if (prevProps.order.deliveryMode !== nextProps.order.deliveryMode) {
    return false;
  }
  if (prevProps.handlePresentModalPress !== nextProps.handlePresentModalPress) {
    return false;
  }
  if (prevProps.onToggleDetails !== nextProps.onToggleDetails) return false;
  if (
    didOrderDetailVisibilityChange(
      prevProps.showDetails,
      nextProps.showDetails,
      nextProps.order,
    )
  ) {
    return false;
  }

  return true;
});
