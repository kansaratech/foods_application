"use client";

import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useTranslations } from "next-intl";

/**
 * Drill-down screens (restaurant/store detail, checkout, order tracking,
 * profile sub-pages, search results…) only relied on the browser's own back
 * button or the header logo to leave — a real gap on mobile web where
 * browser chrome is often hidden (Issue 58).
 *
 * Falls back to `fallbackHref` when there's no in-app history to go back to
 * (e.g. a deep link opened directly), so the button is never a dead end.
 */
export default function BackButton({
  fallbackHref = "/",
  className = "",
  label,
}: {
  fallbackHref?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const t = useTranslations();
  const ariaText = label || t("back_button_label");

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={ariaText}
      className={`inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-[#16293f] dark:text-gray-200 dark:hover:text-blue-300 ${className}`}
    >
      <FontAwesomeIcon icon={faArrowLeft} style={{ width: 14, height: 14 }} />
      {label !== "" && <span>{ariaText}</span>}
    </button>
  );
}
