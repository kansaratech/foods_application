"use client";
import { useEffect, useRef } from "react";
import { useQuery, useSubscription } from "@apollo/client";
import { ORDER_TRACKING } from "@/lib/api/graphql/queries/order-tracking";
import { SUBSCRIPTION_ORDER } from "@/lib/api/graphql/subscription";

function useTracking({ orderId }: { orderId: string }) {
  const {
    data: orderTrackingDetails,
    loading,
    refetch,
    error,
    startPolling,
    stopPolling,
  } = useQuery(ORDER_TRACKING, {
    fetchPolicy: "cache-and-network",
    // Keep the last-known data on screen while a background refetch is in
    // flight instead of dropping back to a loading state on every update.
    notifyOnNetworkStatusChange: false,
    variables: {
      orderDetailsId: orderId,
    },
  });

  const order = orderTrackingDetails?.orderDetails;
  useEffect(() => {
    const terminal = ["DELIVERED", "COMPLETED", "CANCELLED"].includes(
      order?.orderStatus,
    );
    const paymentPending =
      order?.paymentMethod === "CASHFREE" && order?.paymentStatus === "PENDING";
    const refundPending = ["PENDING", "PROCESSING"].includes(
      order?.refundStatus,
    );
    if (order && (!terminal || paymentPending || refundPending))
      startPolling(15000);
    else stopPolling();
    return () => stopPolling();
  }, [
    order?._id,
    order?.orderStatus,
    order?.paymentStatus,
    order?.refundStatus,
    order?.paymentMethod,
    startPolling,
    stopPolling,
  ]);

  // Track the last order status we've already synced a full refetch for, so
  // repeated subscription pushes for the same status don't trigger reloads.
  const lastSyncedStatusRef = useRef<string | null>(null);

  // Subscribe to order updates
  const { data: subscriptionData } = useSubscription(SUBSCRIPTION_ORDER, {
    variables: { id: orderId },
    onSubscriptionData: ({ subscriptionData }) => {
      const update = subscriptionData.data?.subscriptionOrder;
      const nextStatus = update
        ? `${update._id}:${update.orderStatus}:${update.paymentStatus}:${update.refundStatus}:${update.rider?._id}:${update.completionTime}`
        : null;

      // Only pull fresh full-order details when the status actually changes.
      // Other subscription fields (rider, completionTime) are already merged
      // from the subscription payload on the screen, so no refetch is needed.
      if (nextStatus && nextStatus !== lastSyncedStatusRef.current) {
        lastSyncedStatusRef.current = nextStatus;
        refetch();
      }
    },
  });

  return {
    error,
    refetch,
    orderTrackingDetails: orderTrackingDetails?.orderDetails,
    // Only surface the loading state on the very first fetch (before we have
    // any data). Background refetches keep the previous data visible so the
    // screen updates in place instead of flashing a full reload.
    isOrderTrackingDetailsLoading:
      loading && !orderTrackingDetails?.orderDetails,
    subscriptionData: subscriptionData?.subscriptionOrder,
  };
}

export default useTracking;
