"use client";

import { useTranslations } from "next-intl";
import {
  FiCheck,
  FiClock,
  FiCreditCard,
  FiRefreshCw,
  FiShield,
  FiX,
  FiArrowRight,
} from "react-icons/fi";

interface Props {
  paymentMethod: string;
  paymentStatus?: string;
  orderStatus?: string;
  isPickedUp?: boolean;
  refundStatus?: string;
  amount: string;
  rechecking: boolean;
  startingRetry: boolean;
  switchingToCod?: boolean;
  autoChecking?: boolean;
  feedback: string;
  canRetry: boolean;
  onCheck: () => void;
  onRetry: () => void;
  onSwitchToCod?: () => void;
}

export default function PaymentStatusCard({
  paymentMethod,
  paymentStatus,
  orderStatus,
  isPickedUp,
  refundStatus,
  amount,
  rechecking,
  startingRetry,
  switchingToCod = false,
  autoChecking = false,
  feedback,
  canRetry,
  onCheck,
  onRetry,
  onSwitchToCod,
}: Props) {
  const t = useTranslations("payment_panel");
  const isCod = paymentMethod === "COD";
  const state =
    paymentStatus === "REFUNDED" || refundStatus === "SUCCESS"
      ? "refunded"
      : paymentStatus === "PAID"
        ? "success"
        : isCod && orderStatus === "CANCELLED"
          ? "cancelled"
          : isCod
            ? "cod"
            : paymentStatus === "FAILED"
              ? "failed"
              : "pending";
  const actionable =
    !isCod &&
    (state === "pending" || state === "failed") &&
    paymentMethod === "CASHFREE";
  const busy = rechecking || startingRetry || switchingToCod;
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    failed:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
    pending:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
    cod: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    cancelled:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    refunded:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
  const Icon =
    state === "success"
      ? FiCheck
      : state === "failed"
        ? FiX
        : state === "cod"
          ? FiCreditCard
          : state === "refunded" || state === "cancelled"
            ? FiRefreshCw
            : FiClock;

  return (
    <section
      aria-label={t("label")}
      aria-busy={busy}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-900"
    >
      <div className={`border-b p-4 ${styles[state]}`}>
        <div
          className="flex items-start gap-4"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/20">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest">
              {t("label")}
            </p>
            <h3 className="text-base font-semibold">
              {state === "cancelled"
                ? "Order cancelled - no cash due"
                : state === "cod" && isPickedUp
                  ? "Pay at pickup"
                  : state === "pending" && autoChecking
                    ? t("confirming_title")
                    : t(`${state}_title`)}
            </h3>
            <p className="mt-1 text-sm leading-5">
              {state === "cancelled"
                ? "You do not need to pay for this cancelled order."
                : state === "cod" && isPickedUp
                  ? "Pay the store when you collect your order. No online payment is required."
                  : state === "pending" && autoChecking
                    ? t("confirming_description")
                    : t(`${state}_description`)}
            </p>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                state === "success"
                  ? "amount_paid"
                  : state === "refunded" || state === "cancelled"
                    ? "amount"
                    : "amount_due",
              )}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {state === "cancelled" ? "No payment due" : amount}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <FiCreditCard aria-hidden="true" />
            {isCod
              ? t("cash")
              : paymentMethod === "CASHFREE"
                ? "Cashfree"
                : paymentMethod}
          </span>
        </div>
        {actionable && state === "pending" && autoChecking ? (
          // A pending Cashfree payment is usually already settled by the
          // time this loads — the webhook just hasn't caught up yet. Confirm
          // that silently in the background first instead of immediately
          // asking the customer to click something for a payment that may
          // already be done.
          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <FiRefreshCw
              className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span role="status" aria-live="polite">
              {t("auto_checking")}
            </span>
          </div>
        ) : (
          actionable && (
            <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("debit_note")}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={onCheck}
                  disabled={busy}
                  className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${state === "pending" ? "bg-primary-color text-white hover:brightness-95" : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                >
                  <FiRefreshCw
                    className={
                      rechecking
                        ? "animate-spin motion-reduce:animate-none"
                        : ""
                    }
                    aria-hidden="true"
                  />
                  {t(rechecking ? "checking" : "check")}
                </button>
                {canRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={busy}
                    className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${state === "failed" ? "bg-primary-color text-white hover:brightness-95" : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                  >
                    {t(startingRetry ? "opening" : "retry")}
                    <FiArrowRight aria-hidden="true" />
                  </button>
                )}
                {onSwitchToCod && (
                  <button
                    type="button"
                    onClick={onSwitchToCod}
                    disabled={busy}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t(switchingToCod ? "switching_to_cod" : "switch_to_cod")}
                  </button>
                )}
              </div>
            </div>
          )
        )}
        {orderStatus === "CANCELLED" &&
          paymentStatus === "PAID" &&
          refundStatus !== "SUCCESS" && (
            <p
              role="status"
              className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
            >
              {refundStatus === "FAILED"
                ? "Your order was cancelled. The refund needs attention — it hasn't gone through yet. Contact support; your payment source is unchanged until it's retried."
                : `Your order was cancelled. ${amount} will be refunded to the original payment method you used (card, UPI or netbanking) — not to a wallet. This is handled automatically via Cashfree and can take a few days to show up, depending on your bank; no action is needed from you.`}
            </p>
          )}
        {feedback && (
          <p
            role="status"
            className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300"
          >
            {feedback}
          </p>
        )}
        {paymentMethod === "CASHFREE" && (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FiShield className="shrink-0" aria-hidden="true" />
            {t("provider")}
          </p>
        )}
      </div>
    </section>
  );
}
