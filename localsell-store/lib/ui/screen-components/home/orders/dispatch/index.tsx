import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { showMessage } from "react-native-flash-message";
import { router } from "expo-router";

import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useRestaurantContext } from "@/lib/context/global/restaurant";
import useOrderPickedUp from "@/lib/hooks/useOrderPickedUp";
import { STORE_DELIVERY_AGENTS } from "@/lib/apollo/queries/delivery.query";
import {
  ASSIGN_STORE_DELIVERY_AGENT,
  MARK_ORDER_DELIVERED,
} from "@/lib/apollo/mutations/delivery.mutation";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import { IOrder, IStoreDeliveryAgent } from "@/lib/utils/interfaces/order.interface";

/** Small pill that says how an order is being fulfilled. */
export function DeliveryModeBadge({ order }: { order: IOrder }) {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const mode = order.deliveryMode ?? (order.isPickedUp ? "PICKUP" : "PLATFORM");
  const label =
    mode === "PICKUP"
      ? t("Pickup")
      : mode === "SELF"
        ? `${t("My delivery")}${order.storeDeliveryAgent?.name ? ` · ${order.storeDeliveryAgent.name}` : ""}`
        : t("LocalSell fleet");
  return (
    <View
      className="px-3 py-1 rounded-[12px] border self-start"
      style={{ borderColor: appTheme.primary, backgroundColor: appTheme.lowOpacityPrimaryColor }}
    >
      <Text className="text-xs font-semibold" style={{ color: appTheme.primary }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Per-order delivery dispatch — always shown for a delivery order the store is
 * working, no admin needed. The store picks LocalSell fleet vs its own person,
 * confirms hand-over to whoever collects, and (for self-delivery) marks it
 * delivered.
 */
export default function OrderDispatch({ order }: { order: IOrder }) {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { userId: storeId } = useUserContext();
  const { refetch } = useRestaurantContext();
  const { pickedUp } = useOrderPickedUp();
  const [pickChoice, setPickChoice] = useState<"NONE" | "SELF">("NONE");

  const status = order.orderStatus ?? "";
  const mode = order.deliveryMode ?? (order.isPickedUp ? "PICKUP" : "PLATFORM");
  const isWorkable = ["ACCEPTED", "ASSIGNED", "PICKED"].includes(status);

  const { data, loading } = useQuery(STORE_DELIVERY_AGENTS, {
    variables: { storeId },
    skip: !storeId || order.isPickedUp,
    fetchPolicy: "cache-and-network",
  });
  const agents: IStoreDeliveryAgent[] = data?.storeDeliveryAgents ?? [];

  const onError = (e: { message: string }) => showMessage({ message: e.message, type: "danger" });
  const [assign, { loading: assigning }] = useMutation(ASSIGN_STORE_DELIVERY_AGENT, { onError });
  const [markDelivered, { loading: delivering }] = useMutation(MARK_ORDER_DELIVERED, { onError });

  if (order.isPickedUp || !isWorkable) return null;

  const after = async () => {
    await refetch();
  };

  const selfSelected = mode === "SELF" || pickChoice === "SELF";
  const fleetSelected = !selfSelected;
  const locked = status === "PICKED"; // handed over — no more switching

  const chooseFleet = async () => {
    setPickChoice("NONE");
    if (mode === "SELF") {
      await assign({ variables: { orderId: order._id, agentId: null } });
      showMessage({ message: t("Moved to the LocalSell fleet"), type: "success" });
      await after();
    }
  };

  const assignAgent = async (agentId: string) => {
    await assign({ variables: { orderId: order._id, agentId } });
    showMessage({ message: t("Assigned to your delivery person"), type: "success" });
    setPickChoice("NONE");
    await after();
  };

  const confirmHandover = () => {
    pickedUp(order._id);
    setTimeout(after, 700);
  };

  const Segment = ({
    label,
    active,
    onPress,
    disabled,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      className="flex-1 py-2.5 rounded-lg items-center border"
      style={{
        borderColor: active ? appTheme.primary : appTheme.borderLineColor,
        backgroundColor: active ? appTheme.primary : "transparent",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text className="text-xs font-semibold" style={{ color: active ? appTheme.white : appTheme.fontSecondColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="mt-4 pt-4 border-t" style={{ borderColor: appTheme.borderLineColor }}>
      <Text className="text-sm font-bold mb-2" style={{ color: appTheme.fontMainColor }}>
        {t("Delivery")}
      </Text>

      {/* who delivers — segmented choice */}
      {!locked && (
        <View className="flex-row gap-2 mb-3">
          <Segment label={t("LocalSell fleet")} active={fleetSelected} onPress={chooseFleet} disabled={assigning} />
          <Segment
            label={t("My delivery person")}
            active={selfSelected}
            onPress={() => setPickChoice("SELF")}
            disabled={assigning}
          />
        </View>
      )}

      {/* ---- SELF path ---- */}
      {selfSelected ? (
        mode === "SELF" && order.storeDeliveryAgent ? (
          <>
            <Text className="text-xs mb-3" style={{ color: appTheme.fontSecondColor }}>
              {status === "PICKED" ? t("Out for delivery with") : t("Assigned to")}{" "}
              <Text style={{ fontWeight: "700", color: appTheme.fontMainColor }}>
                {order.storeDeliveryAgent.name}
              </Text>
              {order.storeDeliveryAgent.phone ? ` · ${order.storeDeliveryAgent.phone}` : ""}
            </Text>
            {status !== "PICKED" ? (
              <TouchableOpacity
                className="h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: appTheme.primary }}
                onPress={confirmHandover}
              >
                <Text className="text-base font-semibold" style={{ color: appTheme.white }}>
                  {t("Handed over to")} {order.storeDeliveryAgent.name}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                disabled={delivering}
                className="h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: appTheme.primary }}
                onPress={async () => {
                  await markDelivered({ variables: { id: order._id, orderStatus: "DELIVERED" } });
                  showMessage({ message: t("Order delivered"), type: "success" });
                  await after();
                }}
              >
                {delivering ? (
                  <SpinnerComponent color={appTheme.white} />
                ) : (
                  <Text className="text-base font-semibold" style={{ color: appTheme.white }}>
                    {t("Mark delivered")}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            {status !== "PICKED" && (
              <TouchableOpacity className="mt-3" onPress={() => setPickChoice("SELF")}>
                <Text className="text-xs font-semibold" style={{ color: appTheme.primary }}>
                  {t("Change person")}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : loading && agents.length === 0 ? (
          <SpinnerComponent />
        ) : agents.length === 0 ? (
          <View>
            <Text className="text-xs mb-2" style={{ color: appTheme.fontSecondColor }}>
              {t("You have no delivery staff yet.")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/home/delivery-staff" as never)}
              className="h-11 rounded-xl items-center justify-center border"
              style={{ borderColor: appTheme.primary }}
            >
              <Text className="text-xs font-semibold" style={{ color: appTheme.primary }}>
                {t("+ Add delivery staff")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="text-xs mb-2" style={{ color: appTheme.fontSecondColor }}>
              {t("Pick who delivers this order:")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {agents.map((a) => (
                <TouchableOpacity
                  key={a._id}
                  disabled={assigning}
                  onPress={() => assignAgent(a._id)}
                  className="px-4 py-2 rounded-full border"
                  style={{ borderColor: appTheme.primary }}
                >
                  <Text className="text-xs font-semibold" style={{ color: appTheme.primary }}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )
      ) : (
        /* ---- FLEET path ---- */
        <>
          {status === "PICKED" ? (
            <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
              {t("Picked up by the rider")}
              {order.rider?.name ? ` · ${order.rider.name}` : ""}
            </Text>
          ) : order.rider?.name ? (
            <>
              <Text className="text-xs mb-3" style={{ color: appTheme.fontSecondColor }}>
                {t("Rider on the way")} ·{" "}
                <Text style={{ fontWeight: "700", color: appTheme.fontMainColor }}>{order.rider.name}</Text>
                {order.rider.phone ? ` · ${order.rider.phone}` : ""}
              </Text>
              <TouchableOpacity
                className="h-14 rounded-2xl items-center justify-center"
                style={{ backgroundColor: appTheme.primary }}
                onPress={confirmHandover}
              >
                <Text className="text-base font-semibold" style={{ color: appTheme.white }}>
                  {t("Handed over to rider")}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
              {t("Waiting for a LocalSell rider to accept… You can switch to your own person above at any time.")}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
