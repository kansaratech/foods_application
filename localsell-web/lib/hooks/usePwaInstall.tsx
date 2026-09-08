"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Shared "install this PWA" state.
 *
 * Native app stores aren't live yet, so the web app itself is the installable
 * product. Chromium fires `beforeinstallprompt` which we stash and replay from a
 * button; iOS Safari never fires it, so there we fall back to a manual
 * "Share → Add to Home Screen" instruction sheet.
 *
 * The captured prompt is kept in module scope so every `usePwaInstall()` caller
 * (footer button, hero CTA, floating banner) sees the same event — the browser
 * only dispatches it once.
 */

type InstallOutcome = "accepted" | "dismissed" | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PwaPlatform = "ios" | "android" | "desktop" | "other";

let cachedPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    cachedPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    cachedPrompt = null;
    installed = true;
    emit();
  });
}

const detectPlatform = (): PwaPlatform => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as a Mac — disambiguate with touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
  return "other";
};

const detectStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
};

export interface UsePwaInstall {
  /** The OS/browser family, for choosing which instructions to show. */
  platform: PwaPlatform;
  /** Already running as an installed app — hide every install affordance. */
  isInstalled: boolean;
  /** Chromium handed us a `beforeinstallprompt` we can replay right now. */
  canPrompt: boolean;
  /** No one-tap prompt is possible here, so we must show manual steps. */
  needsManualInstructions: boolean;
  /** True when it's worth surfacing an install CTA at all. */
  isInstallable: boolean;
  /** Fire the native prompt if we have one; resolves with the user's choice. */
  promptInstall: () => Promise<InstallOutcome>;
}

export default function usePwaInstall(): UsePwaInstall {
  const [, forceRender] = useState(0);
  const [platform, setPlatform] = useState<PwaPlatform>("other");
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsStandalone(detectStandalone());

    const rerender = () => forceRender((n) => n + 1);
    listeners.add(rerender);

    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onModeChange = () => setIsStandalone(detectStandalone());
    mq?.addEventListener?.("change", onModeChange);

    return () => {
      listeners.delete(rerender);
      mq?.removeEventListener?.("change", onModeChange);
    };
  }, []);

  const isInstalled = installed || isStandalone;
  const canPrompt = !isInstalled && cachedPrompt !== null;
  const needsManualInstructions =
    !isInstalled && !canPrompt && (platform === "ios" || platform === "android");
  const isInstallable = canPrompt || needsManualInstructions;

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!cachedPrompt) return "unavailable";
    const evt = cachedPrompt;
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      cachedPrompt = null;
      emit();
      return outcome;
    } catch {
      return "unavailable";
    }
  }, []);

  return {
    platform,
    isInstalled,
    canPrompt,
    needsManualInstructions,
    isInstallable,
    promptInstall,
  };
}
