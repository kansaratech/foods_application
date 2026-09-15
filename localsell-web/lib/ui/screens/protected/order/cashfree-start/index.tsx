"use client";

import { loadCashfreeSdk } from "@/lib/utils/methods/cashfree";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

// Bridge page opened inside the mobile apps' in-app WebView (localsell-app /
// localsell-store / localsell-rider don't ship the Cashfree JS SDK
// natively) — it does nothing but load the SDK and immediately hand off to
// Cashfree's hosted checkout with the session the API already created. The
// web app itself never navigates here; its own checkout screen calls the SDK
// directly. Cashfree's own return_url (set server-side in
// createCashfreePaymentSession) takes over from here once payment finishes.
export default function CashfreeStartScreen() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const paymentSessionId = searchParams.get("paymentSessionId") || "";
  const mode = searchParams.get("mode") === "production" ? "production" : "sandbox";

  useEffect(() => {
    if (!paymentSessionId) {
      setError("Missing payment session — go back and try again.");
      return;
    }
    let cancelled = false;
    loadCashfreeSdk()
      .then(() => {
        if (cancelled) return;
        const cashfree = (window as any).Cashfree({ mode });
        cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the payment page. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [paymentSessionId, mode]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-color" />
            <p className="text-sm text-neutral-600">Opening secure payment...</p>
          </>
        )}
      </div>
    </div>
  );
}
