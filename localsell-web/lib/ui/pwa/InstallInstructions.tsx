"use client";

import { useTranslations } from "next-intl";
import { FiMoreVertical, FiPlusSquare, FiShare } from "react-icons/fi";

import type { PwaPlatform } from "@/lib/hooks/usePwaInstall";

/**
 * Manual "add to home screen" steps for browsers that don't give us a
 * `beforeinstallprompt` (iOS Safari always, some Android browsers). Rendered
 * inside the install dialog and the floating prompt.
 */
export default function InstallInstructions({
  platform,
}: {
  platform: PwaPlatform;
}) {
  const t = useTranslations();

  const iosSteps = [
    { icon: <FiShare aria-hidden="true" />, text: t("pwa.iosStep1") },
    { icon: <FiPlusSquare aria-hidden="true" />, text: t("pwa.iosStep2") },
    { icon: null, text: t("pwa.iosStep3") },
  ];
  const androidSteps = [
    { icon: <FiMoreVertical aria-hidden="true" />, text: t("pwa.androidStep1") },
    { icon: <FiPlusSquare aria-hidden="true" />, text: t("pwa.androidStep2") },
  ];
  const desktopSteps = [
    { icon: <FiPlusSquare aria-hidden="true" />, text: t("pwa.desktopStep1") },
    { icon: null, text: t("pwa.desktopStep2") },
  ];

  const steps =
    platform === "ios"
      ? iosSteps
      : platform === "android"
        ? androidSteps
        : desktopSteps;

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        {t("pwa.dialogTitle")}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-gray-300">
        {t("pwa.promptBody")}
      </p>
      <ol className="mt-5 space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1c5bc7]/10 text-sm font-bold text-[#1c5bc7]">
              {i + 1}
            </span>
            <span className="flex items-center gap-2 pt-0.5 text-sm text-slate-700 dark:text-gray-200">
              {step.text}
              {step.icon ? (
                <span className="text-base text-[#1c5bc7]">{step.icon}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
