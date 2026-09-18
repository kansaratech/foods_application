"use client";
import React, { useEffect, useState } from "react";
import Image from "@/lib/ui/useable-components/safe-image";
import { IOrderTrackingDetail } from "@/lib/utils/interfaces/order-tracking-detail.interface";
import PaymentStatusCard from "./payment-status-card";
import CancelOrderModal from "./cancelOrderModal";
import CancelOrderSuccessModal from "./cancel-order-success-modal";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { useTranslations } from "next-intl";
import { useMutation } from "@apollo/client";
import {
  CREATE_CASHFREE_PAYMENT_SESSION,
  RECHECK_CASHFREE_PAYMENT,
} from "@/lib/api/graphql";
import { loadCashfreeSdk, cashfreeSdkMode } from "@/lib/utils/methods/cashfree";
import useToast from "@/lib/hooks/useToast";

function TrackingOrderDetails({
  orderTrackingDetails,
}: {
  orderTrackingDetails: IOrderTrackingDetail;
}) {
  const t = useTranslations();
  const [paymentStatus, setPaymentStatus] = useState(
    orderTrackingDetails?.paymentStatus,
  );
  const [paymentFeedback, setPaymentFeedback] = useState("");
  useEffect(() => {
    setPaymentStatus(orderTrackingDetails?.paymentStatus);
    setPaymentFeedback("");
  }, [orderTrackingDetails?._id, orderTrackingDetails?.paymentStatus]);
  const { showToast } = useToast();
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [setshowCancelOrderSuccessModal, setSetshowCancelOrderSuccessModal] =
    useState(orderTrackingDetails?.orderStatus === "CANCELLED" ? true : false);
  const { CURRENCY_SYMBOL, CASHFREE_ENV } = useConfig();
  const [recheckCashfreePayment, { loading: rechecking }] = useMutation(
    RECHECK_CASHFREE_PAYMENT,
  );
  const [createCashfreePaymentSession, { loading: startingRetry }] =
    useMutation(CREATE_CASHFREE_PAYMENT_SESSION);

  const onCheckPaymentStatus = async () => {
    setPaymentFeedback("");
    try {
      const { data } = await recheckCashfreePayment({
        variables: { orderId: orderTrackingDetails._id },
      });
      const result = data?.recheckCashfreePayment;
      if (result?.success && result.paymentStatus)
        setPaymentStatus(result.paymentStatus);
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
      showToast({
        type: "error",
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
  // Format currency values
  const formatCurrency = (amount: number) => {
    return `${CURRENCY_SYMBOL}${amount?.toFixed(2) || "0.00"}`;
  };

  // set orderTrackingDetails.restaurant._id in local storage
  const restaurantId = orderTrackingDetails?.restaurant?._id;
  if (restaurantId) {
    onUseLocalStorage("save", "orderTrackingRestaurantId", restaurantId);
  }

  const calculateItemTotal = (item: any) => {
    // Use the order's snapshotted unit price (already discount-applied at
    // order time), not the live variation's price — the variation's own
    // price can change later or simply be the pre-discount price, which
    // would make the displayed total drift from orderAmount.
    const variationPrice = item.price ?? item.variation?.price ?? 0;
    const addonsPrice =
      item.addons?.reduce((sum: number, addon: any) => {
        return (
          sum +
          addon.options.reduce(
            (optSum: number, option: any) =>
              optSum + (option.price || 0) * (option.quantity ?? 1),
            0,
          )
        );
      }, 0) || 0;
    return (variationPrice + addonsPrice) * item.quantity;
  };

  // Subtotal (addon-inclusive, per item) — matches the server's discount base
  // (order.service.ts itemsTotal) so Subtotal + Delivery + Tax + Tip - Discount
  // reconciles with orderAmount.
  const calculateSubtotal = () => {
    if (!orderTrackingDetails?.items) return 0;
    return orderTrackingDetails.items.reduce(
      (total, item) => total + calculateItemTotal(item),
      0,
    );
  };

  // Customer self-cancel is disabled platform-wide, at every order status —
  // once placed, only the store/admin can cancel. The API's `abortOrder`
  // rejects unconditionally now too; this just keeps the dead-end button from
  // ever showing.
  const canCancelOrder = () => false;

  if (!orderTrackingDetails) {
    return (
      <div className="mt-8 p-4 text-center">
        {t("loading_order_details_text")}
      </div>
    );
  }
  // Get Order instructions from local storage
  // const orderInstructions = localStorage.getItem("newOrderInstructions");

  const orderInstructions =
    orderTrackingDetails?.instructions ||
    t("order_details_no_instructions_text");

  return (
    <div className="mt-8 space-y-6 flex-1 max-w-2xl md:w-auto w-full md:px-0 px-4">
      <div>
        <div className="flex flex-col mb-2 md:mb-4">
          <h1 className="text-lg font-semibold dark:text-gray-100">
            {orderTrackingDetails?.restaurant?.name}
          </h1>
          <div className="flex items-center gap-2">
            <h1 className="text-gray-700 dark:text-gray-300">
              {t("order_details_subheading")} #{" "}
            </h1>
            <h1 className="text-secondary-color dark:text-primary-color">
              {orderTrackingDetails?.orderId}
            </h1>
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">
          {t("order_details_heading")}
        </h3>

        {/* Display each food item under Order Details */}
        {orderTrackingDetails.items?.map((item, index) => (
          <div
            key={item._id || index}
            className="flex items-center justify-between mb-4 pb-4 border-b dark:border-gray-700"
          >
            <div className="flex gap-4 items-center">
              <Image
                src={
                  item.image ||
                  "https://storage.googleapis.com/a1aa/image/placeholder-food.jpg"
                }
                alt={item.title}
                width={80}
                height={80}
                className="rounded-lg"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {item.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.variation.title}
                  <br />
                  {item.description?.substring(0, 50)}
                  {item.description?.length > 50 ? "..." : ""}
                </p>

                {/* Display addons */}
                {item.addons && item.addons.length > 0 && (
                  <div className="mt-1">
                    {item.addons.map((addon, addonIndex) => (
                      <div key={addon._id || addonIndex}>
                        {addon.options.map((option, optIndex) => (
                          <p
                            key={option._id || optIndex}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          >
                            +{" "}
                            {option.quantity > 1 ? `${option.quantity}× ` : ""}
                            {option.title}
                            {option.price > 0
                              ? ` (${formatCurrency(option.price * (option.quantity ?? 1))})`
                              : ""}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className="text-secondary-color dark:text-primary-color font-semibold">
              {formatCurrency(calculateItemTotal(item))}
            </span>
          </div>
        ))}
      </div>
      <div className="border-gray-200 border-b">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg md:text-[16px] lg:text-[18px] mb-4">
          {t("order_details_instruction_label")}
        </h2>
        <p className="text-gray-500 dark:text-gray-300 mb-4 leading-5 sm:leading-5 tracking-normal font-inter text-xs sm:text-sm md:text-sm align-middle">
          {orderInstructions}
        </p>
      </div>
      {/* Items Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">
          {t("order_details_summary_label")} (
          {orderTrackingDetails.items?.length || 0}{" "}
          {t("order_details_items_label")})
        </h3>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
          {/* Display each item with quantity and price */}
          {orderTrackingDetails.items?.map((item, idx) => (
            <div key={`summary-item-${idx}`} className="flex justify-between">
              <span>
                {item.quantity}x {item.title}
              </span>
              <span>{formatCurrency(calculateItemTotal(item))}</span>
            </div>
          ))}

          {/* Subtotal and charges */}
          <div className="flex justify-between pt-2 border-t dark:border-gray-700">
            <span>{t("order_details_subtotal_label")}</span>
            <span>{formatCurrency(calculateSubtotal())}</span>
          </div>

          {orderTrackingDetails.taxationAmount > 0 && (
            <div className="flex justify-between">
              <span>{t("order_details_tax_label")}</span>
              <span>{formatCurrency(orderTrackingDetails.taxationAmount)}</span>
            </div>
          )}

          {orderTrackingDetails.tipping > 0 && (
            <div className="flex justify-between">
              <span>{t("order_details_tip_label")}</span>
              <span>{formatCurrency(orderTrackingDetails.tipping)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>{t("order_details_delivery_charge_label")}</span>
            <span>
              {formatCurrency(orderTrackingDetails.deliveryCharges || 0)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>{t("discount_label")}</span>

            <span className="text-red-500">
              -{""} {formatCurrency(orderTrackingDetails.discountAmount || 0)}
            </span>
          </div>

          <div className="flex justify-between font-semibold pt-2 border-t dark:border-gray-700">
            <span>{t("order_details_total_label")}</span>
            <span>{formatCurrency(orderTrackingDetails.orderAmount)}</span>
          </div>
        </div>
      </div>

      <PaymentStatusCard
        paymentMethod={orderTrackingDetails.paymentMethod}
        paymentStatus={paymentStatus}
        amount={formatCurrency(orderTrackingDetails.orderAmount)}
        rechecking={rechecking}
        startingRetry={startingRetry}
        feedback={paymentFeedback}
        onCheck={onCheckPaymentStatus}
        onRetry={onPayAgain}
        canRetry={orderTrackingDetails.orderStatus !== "CANCELLED"}
      />

      {/* Cancel Button - only show for pending/accepted orders */}
      {canCancelOrder() && (
        <div className="text-center">
          <button
            onClick={() => setIsCancelModalVisible(true)}
            className="w-full border border-red-500 text-red-500 px-6 py-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500 dark:hover:text-red-200  transition"
          >
            {t("order_details_cancel_order_button")}
          </button>
        </div>
      )}

      {/* Cancel Order Modal */}
      <CancelOrderModal
        visible={isCancelModalVisible}
        onHide={() => {
          setIsCancelModalVisible(false);
        }}
        onSuccess={() => {
          setIsCancelModalVisible(false);
          setSetshowCancelOrderSuccessModal(true);
        }}
        orderId={orderTrackingDetails._id}
      />
      <CancelOrderSuccessModal
        visible={setshowCancelOrderSuccessModal}
        onHide={() => setSetshowCancelOrderSuccessModal(false)}
      />
    </div>
  );
}

export default TrackingOrderDetails;
