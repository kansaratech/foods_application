"use client";
import React, { useEffect, useRef, useState } from "react";
import { IOrderTrackingDetail } from "@/lib/utils/interfaces/order-tracking-detail.interface";
import PaymentStatusCard from "./payment-status-card";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { useTranslations } from "next-intl";
import { useMutation } from "@apollo/client";
import {
  CREATE_CASHFREE_PAYMENT_SESSION,
  RECHECK_CASHFREE_PAYMENT,
} from "@/lib/api/graphql";
import { loadCashfreeSdk, cashfreeSdkMode } from "@/lib/utils/methods/cashfree";
import useToast from "@/lib/hooks/useToast";

// A Cashfree payment that already went through often lands here before the
// webhook (or the tracking query) has caught up, so the panel would open on
// a stale "pending" order and make the customer manually hit "Check payment
// status" for something that's already done. Instead, poll the same
// server-verified reconciliation silently in the background first, and only
// surface the manual check/retry UI if that comes up empty.
const AUTO_CHECK_INTERVAL_MS = 4000;
const AUTO_CHECK_MAX_ATTEMPTS = 8; // ~32s of silent checking before asking the customer

export default function OrderPaymentPanel({
  orderTrackingDetails,
  onUpdated,
}: {
  orderTrackingDetails: IOrderTrackingDetail;
  onUpdated?: () => Promise<unknown>;
}) {
  const t = useTranslations();
  const [paymentStatus, setPaymentStatus] = useState(
    orderTrackingDetails?.paymentStatus,
  );
  const [paymentFeedback, setPaymentFeedback] = useState("");
  const [autoChecking, setAutoChecking] = useState(false);
  const autoCheckedOrderRef = useRef<string | null>(null);
  useEffect(() => {
    setPaymentStatus(orderTrackingDetails?.paymentStatus);
    setPaymentFeedback("");
  }, [orderTrackingDetails?._id, orderTrackingDetails?.paymentStatus]);
  const { showToast } = useToast();
  const { CURRENCY_SYMBOL, CASHFREE_ENV } = useConfig();
  const [recheckCashfreePayment, { loading: rechecking }] = useMutation(
    RECHECK_CASHFREE_PAYMENT,
  );
  const [createCashfreePaymentSession, { loading: startingRetry }] =
    useMutation(CREATE_CASHFREE_PAYMENT_SESSION);

  useEffect(() => {
    const orderId = orderTrackingDetails._id;
    const canAutoCheck =
      orderTrackingDetails.paymentMethod === "CASHFREE" &&
      orderTrackingDetails.paymentStatus === "PENDING" &&
      !["CANCELLED", "DELIVERED", "COMPLETED"].includes(
        orderTrackingDetails.orderStatus,
      );

    if (!canAutoCheck) {
      autoCheckedOrderRef.current = null;
      setAutoChecking(false);
      return;
    }
    // Run the silent background poll once per order — re-renders (e.g. from
    // the status update below) shouldn't restart it.
    if (autoCheckedOrderRef.current === orderId) return;
    autoCheckedOrderRef.current = orderId;

    let cancelled = false;
    setAutoChecking(true);

    const poll = async () => {
      for (let attempt = 0; attempt < AUTO_CHECK_MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          // eslint-disable-next-line no-await-in-loop
          const { data } = await recheckCashfreePayment({
            variables: { orderId },
          });
          const result = data?.recheckCashfreePayment;
          if (result?.paymentStatus && result.paymentStatus !== "PENDING") {
            if (!cancelled) {
              setPaymentStatus(result.paymentStatus);
              await onUpdated?.();
            }
            return;
          }
        } catch {
          // transient network error — keep polling silently
        }
        if (cancelled) return;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) =>
          setTimeout(resolve, AUTO_CHECK_INTERVAL_MS),
        );
      }
    };

    void poll().finally(() => {
      if (!cancelled) setAutoChecking(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orderTrackingDetails._id,
    orderTrackingDetails.paymentMethod,
    orderTrackingDetails.paymentStatus,
    orderTrackingDetails.orderStatus,
  ]);

  const onCheckPaymentStatus = async () => {
    setPaymentFeedback("");
    try {
      const { data } = await recheckCashfreePayment({
        variables: { orderId: orderTrackingDetails._id },
      });
      const result = data?.recheckCashfreePayment;
      if (result?.success && result.paymentStatus) {
        setPaymentStatus(result.paymentStatus);
        await onUpdated?.();
      }
      setPaymentFeedback(
        t(
          result?.success
            ? "payment_panel.checked"
            : "payment_panel.check_error",
        ),
      );
      showToast({
        type: !result?.success
          ? "error"
          : result?.paymentStatus === "PAID"
            ? "success"
            : "info",
        title: t("order_details_payment_status_title"),
        message: result?.message || "",
      });
    } catch (err: any) {
      setPaymentFeedback(t("payment_panel.check_error"));
      showToast({
        type: "error",
        title: t("order_details_payment_status_title"),
        message: err?.message || "",
      });
    }
  };

  const onPayAgain = async () => {
    try {
      const [{ data }] = await Promise.all([
        createCashfreePaymentSession({
          variables: { orderId: orderTrackingDetails._id },
        }),
        loadCashfreeSdk(),
      ]);
      const session = data?.createCashfreePaymentSession;
      if (session?.success && session?.paymentSessionId) {
        const cashfree = (window as any).Cashfree({
          mode: cashfreeSdkMode(CASHFREE_ENV),
        });
        await cashfree.checkout({
          paymentSessionId: session.paymentSessionId,
          redirectTarget: "_self",
        });
        return;
      }
      await onUpdated?.();
      showToast({
        type: "info",
        title: t("order_details_payment_status_title"),
        message: session?.message || "",
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: t("order_details_payment_status_title"),
        message: err?.message || "",
      });
    }
  };

  return (
    <PaymentStatusCard
      paymentMethod={orderTrackingDetails.paymentMethod}
      paymentStatus={paymentStatus}
      orderStatus={orderTrackingDetails.orderStatus}
      isPickedUp={orderTrackingDetails.isPickedUp}
      refundStatus={orderTrackingDetails.refundStatus}
      amount={`${CURRENCY_SYMBOL}${(paymentStatus === "PAID" && orderTrackingDetails.paidAmount > 0 ? orderTrackingDetails.paidAmount : orderTrackingDetails.orderAmount).toFixed(2)}`}
      rechecking={rechecking}
      startingRetry={startingRetry}
      autoChecking={autoChecking}
      feedback={paymentFeedback}
      onCheck={onCheckPaymentStatus}
      onRetry={onPayAgain}
      canRetry={
        !["CANCELLED", "DELIVERED", "COMPLETED"].includes(
          orderTrackingDetails.orderStatus,
        )
      }
    />
  );
}
