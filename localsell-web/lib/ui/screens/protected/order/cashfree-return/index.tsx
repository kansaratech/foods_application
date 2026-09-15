"use client";

import { ORDER_PAYMENT_STATUS } from "@/lib/api/graphql/queries/order-tracking";
import { CREATE_CASHFREE_PAYMENT_SESSION } from "@/lib/api/graphql";
import useUser from "@/lib/hooks/useUser";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { loadCashfreeSdk, cashfreeSdkMode } from "@/lib/utils/methods/cashfree";
import { useApolloClient, useMutation } from "@apollo/client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COUPON_STORAGE_KEY = "applied_coupon";
const COUPON_TEXT_STORAGE_KEY = "coupon_text";
const COUPON_APPLIED_STORAGE_KEY = "is_coupon_applied";
const COUPON_RESTAURANT_KEY = "coupon_restaurant_id";
const PENDING_CASHFREE_ORDER_ID_KEY = "pending_cashfree_order_id";
const PENDING_CASHFREE_STARTED_AT_KEY = "pending_cashfree_started_at";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

interface OrderPaymentStatusResult {
  orderDetails: {
    _id: string;
    orderId: string;
    paymentMethod: string;
    paymentStatus: "PENDING" | "PAID" | "FAILED";
    orderStatus: string;
  } | null;
}

// Cashfree's own return_url (built server-side in payment.resolvers.ts,
// createCashfreePaymentSession) always carries our DB order id as `order_id`,
// so there's no need to search the ORDERS list by display orderId — we
// already know exactly which order to poll.
export default function CashfreeReturnScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = useApolloClient();
  const { clearCart } = useUser();
  const { CASHFREE_ENV } = useConfig();
  const [status, setStatus] = useState<"polling" | "paid" | "failed" | "timeout">("polling");
  const finalizingRef = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [createCashfreePaymentSession] = useMutation(CREATE_CASHFREE_PAYMENT_SESSION);

  const orderDbId = useMemo(() => {
    const queryOrderId = searchParams.get("order_id");
    if (typeof window !== "undefined") {
      if (queryOrderId) {
        localStorage.setItem(PENDING_CASHFREE_ORDER_ID_KEY, queryOrderId);
        localStorage.setItem(PENDING_CASHFREE_STARTED_AT_KEY, Date.now().toString());
        return queryOrderId;
      }
      return localStorage.getItem(PENDING_CASHFREE_ORDER_ID_KEY) || "";
    }
    return queryOrderId || "";
  }, [searchParams]);

  const clearPendingCashfreeState = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PENDING_CASHFREE_ORDER_ID_KEY);
    localStorage.removeItem(PENDING_CASHFREE_STARTED_AT_KEY);
  }, []);

  const finalizePaid = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    await clearCart();
    onUseLocalStorage("delete", COUPON_STORAGE_KEY);
    onUseLocalStorage("delete", COUPON_TEXT_STORAGE_KEY);
    onUseLocalStorage("delete", COUPON_APPLIED_STORAGE_KEY);
    onUseLocalStorage("delete", COUPON_RESTAURANT_KEY);
    clearPendingCashfreeState();
    setStatus("paid");
    router.replace(`/order/${orderDbId}/tracking`);
  }, [clearCart, clearPendingCashfreeState, orderDbId, router]);

  useEffect(() => {
    if (!orderDbId) {
      setStatus("timeout");
      return;
    }

    let isMounted = true;

    const run = async () => {
      const startedAt =
        Number(
          typeof window !== "undefined"
            ? localStorage.getItem(PENDING_CASHFREE_STARTED_AT_KEY)
            : null,
        ) || Date.now();

      while (isMounted && !finalizingRef.current) {
        try {
          const result = await client.query<OrderPaymentStatusResult>({
            query: ORDER_PAYMENT_STATUS,
            variables: { orderDetailsId: orderDbId },
            fetchPolicy: "network-only",
          });
          const order = result.data?.orderDetails;
          if (order?.paymentStatus === "PAID") {
            await finalizePaid();
            return;
          }
          if (order?.paymentStatus === "FAILED") {
            if (isMounted) setStatus("failed");
            return;
          }
        } catch {
          // transient network error — keep polling until the timeout
        }

        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          if (isMounted) setStatus("timeout");
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [client, finalizePaid, orderDbId]);

  const onRetryPayment = useCallback(async () => {
    if (!orderDbId) return;
    setRetrying(true);
    try {
      const [{ data }] = await Promise.all([
        createCashfreePaymentSession({ variables: { orderId: orderDbId } }),
        loadCashfreeSdk(),
      ]);
      const session = data?.createCashfreePaymentSession;
      if (session?.success && session?.paymentSessionId) {
        localStorage.setItem(PENDING_CASHFREE_STARTED_AT_KEY, Date.now().toString());
        const cashfree = (window as any).Cashfree({ mode: cashfreeSdkMode(CASHFREE_ENV) });
        cashfree.checkout({ paymentSessionId: session.paymentSessionId, redirectTarget: "_self" });
        return;
      }
    } finally {
      setRetrying(false);
    }
  }, [CASHFREE_ENV, createCashfreePaymentSession, orderDbId]);

  const heading =
    status === "failed"
      ? "Payment didn't go through"
      : status === "timeout"
        ? "Payment submitted"
        : "Confirming your payment";

  const message =
    status === "failed"
      ? "Your Cashfree payment failed or was cancelled. Your order is still saved — you can retry the payment or pay cash on delivery instead."
      : status === "timeout"
        ? "We're still waiting for Cashfree's confirmation. Your order may appear in a moment — check your order history if this takes too long."
        : "Please wait while we confirm your payment with Cashfree.";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        {status === "polling" ? (
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-color" />
        ) : null}
        <h1 className="text-2xl font-semibold text-neutral-900">{heading}</h1>
        <p className="mt-3 text-sm text-neutral-600">{message}</p>

        {orderDbId ? (
          <p className="mt-4 text-xs text-neutral-400">Reference: {orderDbId}</p>
        ) : null}

        {status === "failed" || status === "timeout" ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {status === "failed" ? (
              <button
                className="rounded-full bg-primary-color px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
                onClick={onRetryPayment}
                disabled={retrying}
              >
                {retrying ? "Starting..." : "Retry payment"}
              </button>
            ) : null}
            <button
              className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700"
              onClick={() => router.push(orderDbId ? `/order/${orderDbId}/tracking` : "/profile/order-history")}
            >
              View my order
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
