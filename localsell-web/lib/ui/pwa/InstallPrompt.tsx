"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FiDownload, FiX } from "react-icons/fi";

import usePwaInstall from "@/lib/hooks/usePwaInstall";
import CustomDialog from "@/lib/ui/useable-components/custom-dialog";
import InstallInstructions from "./InstallInstructions";

const DISMISS_KEY = "ls:pwa-prompt-dismissed-at";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const SHOW_DELAY_MS = 4000;

const wasRecentlyDismissed = (): boolean => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * One-time, dismissible "add LocalSell to your home screen" banner. Shows a few
 * seconds after load for visitors who haven't installed and haven't dismissed it
 * in the last two weeks. Covers iOS too (opens the manual steps dialog).
 */
export default function InstallPrompt() {
  const t = useTranslations();
  const pathname = usePathname();
  const { isInstalled, isInstallable, canPrompt, platform, promptInstall } =
    usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // These routes carry a fixed bottom tab bar on mobile — lift the card clear of it.
  const overMobileNav =
    pathname?.endsWith("/restaurants") ||
    pathname?.endsWith("/discovery") ||
    pathname?.endsWith("/store");

  useEffect(() => {
    if (isInstalled || !isInstallable) return;
    if (wasRecentlyDismissed()) return;
    const id = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(id);
  }, [isInstalled, isInstallable]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode — fine, it'll show again next visit */
    }
  };

  const handleInstall = async () => {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "accepted" || outcome === "dismissed") setVisible(false);
      else setShowSteps(true);
      return;
    }
    setShowSteps(true);
  };

  if (isInstalled) return null;

  return (
    <>
      {visible && (
        <div
          className={`fixed right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(22,41,63,0.18)] sm:bottom-4 dark:border-gray-700 dark:bg-gray-800 ${
            overMobileNav ? "bottom-[76px]" : "bottom-4"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1c5bc7]/10 text-[#1c5bc7]">
              <FiDownload aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {t("pwa.promptTitle")}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-gray-300">
                {t("pwa.promptBody")}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("pwa.notNow")}
              className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-white"
            >
              <FiX aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-[#1c5bc7] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
            >
              {t("pwa.install")}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800 dark:text-gray-300 dark:hover:text-white"
            >
              {t("pwa.notNow")}
            </button>
          </div>
        </div>
      )}

      <CustomDialog visible={showSteps} onHide={() => setShowSteps(false)} width="420px">
        <div className="px-6 pb-6">
          <InstallInstructions platform={platform} />
        </div>
      </CustomDialog>
    </>
  );
}
