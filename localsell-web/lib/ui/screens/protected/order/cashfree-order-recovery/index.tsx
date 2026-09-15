"use client";

import useUser from "@/lib/hooks/useUser";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const COUPON_STORAGE_KEY = "applied_coupon";
const COUPON_TEXT_STORAGE_KEY = "coupon_text";
const COUPON_APPLIED_STORAGE_KEY = "is_coupon_applied";
const COUPON_RESTAURANT_KEY = "coupon_restaurant_id";
const PENDING_CASHFREE_ORDER_ID_KEY = "pending_cashfree_order_id";
const PENDING_CASHFREE_STARTED_AT_KEY = "pending_cashfree_started_at";

// Mounted globally: if a customer closes the tab mid-Cashfree-checkout (or
// gets bounced somewhere other than /order/cashfree/return) and comes back
// to any page on the site, and their order has since shown up in their order
// list, send them to tracking instead of leaving them stuck on a stale
// "payment in progress" state.
export default function CashfreeOrderRecovery() {
  const router = useRouter();
  const pathname = usePathname();
  const { clearCart, orders } = useUser();
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || isRedirectingRef.current) return;

    // We store the DB _id directly (not the display orderId) — see
    // createCashfreePaymentSession's return_url in payment.resolvers.ts.
    const pendingOrderDbId = onUseLocalStorage("get", PENDING_CASHFREE_ORDER_ID_KEY);
    if (!pendingOrderDbId) return;

    const isTrackingPage = pathname.includes("/tracking");
    const matchingOrder = orders.find((order) => order._id === pendingOrderDbId);

    if (!matchingOrder?._id) return;
    if (isTrackingPage && pathname.includes(matchingOrder._id)) {
      onUseLocalStorage("delete", PENDING_CASHFREE_ORDER_ID_KEY);
      onUseLocalStorage("delete", PENDING_CASHFREE_STARTED_AT_KEY);
      return;
    }

    isRedirectingRef.current = true;

    const finalizeCashfreeOrder = async () => {
      await clearCart();
      onUseLocalStorage("delete", COUPON_STORAGE_KEY);
      onUseLocalStorage("delete", COUPON_TEXT_STORAGE_KEY);
      onUseLocalStorage("delete", COUPON_APPLIED_STORAGE_KEY);
      onUseLocalStorage("delete", COUPON_RESTAURANT_KEY);
      onUseLocalStorage("delete", PENDING_CASHFREE_ORDER_ID_KEY);
      onUseLocalStorage("delete", PENDING_CASHFREE_STARTED_AT_KEY);
      router.replace(`/order/${matchingOrder._id}/tracking`);
    };

    void finalizeCashfreeOrder();
  }, [clearCart, orders, pathname, router]);

  return null;
}
