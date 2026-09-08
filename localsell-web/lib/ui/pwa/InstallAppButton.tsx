"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FiDownload } from "react-icons/fi";

import usePwaInstall from "@/lib/hooks/usePwaInstall";
import CustomDialog from "@/lib/ui/useable-components/custom-dialog";
import InstallInstructions from "./InstallInstructions";

type Variant = "footer" | "primary" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  // Matches the old App Store / Google Play pills in the footer.
  footer:
    "flex w-fit items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.08] px-3.5 py-2.5 text-left backdrop-blur-sm transition hover:bg-white/15",
  primary:
    "inline-flex items-center gap-2 rounded-xl bg-[#1c5bc7] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95",
  ghost:
    "inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-slate-400 dark:border-gray-600 dark:text-white",
};

/**
 * "Install App" control. Fires the native install prompt when the browser gave
 * us one, otherwise opens a dialog with manual add-to-home-screen steps.
 *
 * `hideWhenUnavailable` keeps it off desktop browsers that can neither prompt
 * nor be installed (e.g. Firefox) — used for the hero CTA. The footer leaves it
 * visible so there's always a way through.
 */
export default function InstallAppButton({
  variant = "primary",
  className = "",
  hideWhenUnavailable = false,
}: {
  variant?: Variant;
  className?: string;
  hideWhenUnavailable?: boolean;
}) {
  const t = useTranslations();
  const { isInstalled, isInstallable, canPrompt, platform, promptInstall } =
    usePwaInstall();
  const [showSteps, setShowSteps] = useState(false);

  if (isInstalled) return null;
  if (hideWhenUnavailable && !isInstallable) return null;

  const handleClick = async () => {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome === "unavailable") setShowSteps(true);
      return;
    }
    setShowSteps(true);
  };

  if (variant === "footer") {
    return (
      <>
        <button type="button" onClick={handleClick} className={`${VARIANT_CLASS.footer} ${className}`}>
          <FiDownload aria-hidden="true" className="h-5 w-5 text-[#8fbdf0]" />
          <span>
            <span className="block text-[9px] leading-none text-white/55">
              {t("pwa.footerKicker")}
            </span>
            <span className="mt-1 block text-xs font-semibold leading-none">
              {t("pwa.install")}
            </span>
          </span>
        </button>
        <CustomDialog visible={showSteps} onHide={() => setShowSteps(false)} width="420px">
          <div className="px-6 pb-6">
            <InstallInstructions platform={platform} />
          </div>
        </CustomDialog>
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={`${VARIANT_CLASS[variant]} ${className}`}>
        <FiDownload aria-hidden="true" className="h-4 w-4" />
        {t("pwa.install")}
      </button>
      <CustomDialog visible={showSteps} onHide={() => setShowSteps(false)} width="420px">
        <div className="px-6 pb-6">
          <InstallInstructions platform={platform} />
        </div>
      </CustomDialog>
    </>
  );
}
