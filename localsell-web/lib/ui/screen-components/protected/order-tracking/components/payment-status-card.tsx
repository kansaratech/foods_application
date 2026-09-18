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
  amount: string;
  rechecking: boolean;
  startingRetry: boolean;
  feedback: string;
  canRetry: boolean;
  onCheck: () => void;
  onRetry: () => void;
}

export default function PaymentStatusCard({
  paymentMethod,
  paymentStatus,
  amount,
  rechecking,
  startingRetry,
  feedback,
  canRetry,
  onCheck,
  onRetry,
}: Props) {
  const t = useTranslations("payment_panel");
  const isCod = paymentMethod === "COD";
  const state =
    paymentStatus === "PAID"
      ? "success"
      : isCod
        ? "cod"
        : paymentStatus === "FAILED"
          ? "failed"
          : paymentStatus === "REFUNDED"
            ? "refunded"
            : "pending";
  const actionable =
    !isCod &&
    (state === "pending" || state === "failed") &&
    paymentMethod === "CASHFREE";
  const busy = rechecking || startingRetry;
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    failed:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
    pending:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
    cod: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
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
          : state === "refunded"
            ? FiRefreshCw
            : FiClock;

  return (
    <section
      aria-label={t("label")}
      aria-busy={busy}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-900"
    >
      <div className={`border-b p-5 sm:p-6 ${styles[state]}`}>
        <div
          className="flex items-start gap-4"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-black/20">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest">
              {t("label")}
            </p>
            <h3 className="text-lg font-semibold sm:text-xl">
              {t(`${state}_title`)}
            </h3>
            <p className="mt-2 text-sm leading-6">
              {t(`${state}_description`)}
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                state === "success"
                  ? "amount_paid"
                  : state === "refunded"
                    ? "amount"
                    : "amount_due",
              )}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {amount}
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
        {actionable && (
          <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t("debit_note")}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onCheck}
                disabled={busy}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${state === "pending" ? "bg-primary-color text-white hover:brightness-95" : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"}`}
              >
                <FiRefreshCw
                  className={
                    rechecking ? "animate-spin motion-reduce:animate-none" : ""
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
            </div>
          </div>
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
          <p className="mt-5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FiShield className="shrink-0" aria-hidden="true" />
            {t("provider")}
          </p>
        )}
      </div>
    </section>
  );
}
