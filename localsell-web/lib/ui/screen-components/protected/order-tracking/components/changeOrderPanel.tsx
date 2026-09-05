"use client";

import React from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";

import { MODIFY_ORDER } from "@/lib/api/graphql";
import useToast from "@/lib/hooks/useToast";

interface Props {
  order: {
    _id: string;
    orderStatus?: string;
    isPickedUp?: boolean;
    paymentMethod?: string;
  };
  onChanged?: () => void;
}

/**
 * Shown only while the order is PENDING (before the store accepts). Lets the
 * customer flip delivery ↔ pickup and cash ↔ pay-online. The server recomputes
 * the delivery fee + total and re-checks the delivery area.
 */
export default function ChangeOrderPanel({ order, onChanged }: Props) {
  const t = useTranslations();
  const { showToast } = useToast();

  const [modifyOrder, { loading }] = useMutation(MODIFY_ORDER, {
    onCompleted: () => {
      showToast({ type: "success", title: t("Order updated"), message: t("Your order has been updated") });
      onChanged?.();
    },
    onError: (e) =>
      showToast({ type: "error", title: t("Could not update the order"), message: e.message }),
  });

  if ((order.orderStatus || "PENDING") !== "PENDING") return null;

  const isPickup = !!order.isPickedUp;
  const isCod = (order.paymentMethod || "COD") === "COD";

  const Btn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      disabled={loading || active}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-[#16293f] text-white"
          : "border border-gray-300 text-gray-600 hover:border-[#16293f] hover:text-[#16293f] disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="mb-6 w-full rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 text-sm font-semibold">{t("Change this order")}</p>
      <p className="mb-3 text-xs text-gray-500">
        {t("You can still switch until the restaurant accepts it")}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">{t("Fulfilment")}</span>
          <Btn active={!isPickup} onClick={() => modifyOrder({ variables: { id: order._id, isPickedUp: false } })}>
            {t("Delivery")}
          </Btn>
          <Btn active={isPickup} onClick={() => modifyOrder({ variables: { id: order._id, isPickedUp: true } })}>
            {t("Pickup")}
          </Btn>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">{t("Payment")}</span>
          <Btn active={isCod} onClick={() => modifyOrder({ variables: { id: order._id, paymentMethod: "COD" } })}>
            {t("Cash")}
          </Btn>
          <Btn active={!isCod} onClick={() => modifyOrder({ variables: { id: order._id, paymentMethod: "STRIPE" } })}>
            {t("Pay online")}
          </Btn>
        </div>
      </div>
    </div>
  );
}
