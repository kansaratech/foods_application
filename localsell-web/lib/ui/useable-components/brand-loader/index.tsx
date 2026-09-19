"use client";
import Image from "next/image";
import { CSSProperties, useSyncExternalStore } from "react";
import type { ProgressSpinnerProps } from "primereact/progressspinner";
import { networkActivity } from "@/lib/utils/network-activity";
import styles from "./loader.module.css";

type Props = {
  variant?: "screen" | "page" | "panel" | "compact" | "inline";
  label?: string;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
};
export default function BrandLoader({
  variant = "panel",
  label = "Loading...",
  size = 24,
  className = "",
  style,
}: Props) {
  if (variant === "inline")
    return (
      <span
        role="status"
        aria-label={`Localsell: ${label}`}
        className={`${styles.mark} ${className}`}
        style={{ width: size, height: size, ...style }}
      >
        <Image
          src="/assets/brand/localsell-icon.png"
          alt=""
          width={24}
          height={24}
          unoptimized
        />
      </span>
    );
  // A full-page/screen loader used to just be blank space around the spinner
  // — the page looked dead rather than "working". These two variants now show
  // a low-opacity skeleton of a generic page shape behind the spinner instead,
  // so there's always something on screen suggesting content is on its way.
  const showSkeleton = variant === "screen" || variant === "page";

  return (
    <span
      role="status"
      aria-label={`Localsell: ${label}`}
      data-localsell-loader={variant}
      className={`${styles.loader} ${styles[variant]} ${className}`}
      style={style}
    >
      {showSkeleton && (
        <span className={styles.skeletonBg} aria-hidden="true">
          <span className={styles.skelBar} style={{ width: "40%" }} />
          <span className={styles.skelRow}>
            <span className={styles.skelCard} />
            <span className={styles.skelCard} />
            <span className={styles.skelCard} />
          </span>
          <span className={styles.skelBar} style={{ width: "55%" }} />
          <span className={styles.skelRow}>
            <span className={styles.skelCard} />
            <span className={styles.skelCard} />
            <span className={styles.skelCard} />
          </span>
        </span>
      )}
      <span className={styles.content}>
        <span className={styles.logo} aria-hidden="true">
          <Image
            className={styles.lightLogo}
            src="/assets/brand/localsell-logo.png"
            alt=""
            width={180}
            height={50}
            priority
            unoptimized
          />
          <Image
            className={styles.darkLogo}
            src="/assets/brand/localsell-logo-inverse.png"
            alt=""
            width={180}
            height={50}
            priority
            unoptimized
          />
        </span>
        <span className={styles.track} aria-hidden="true">
          <span />
        </span>
        <span className={styles.label}>{label}</span>
      </span>
    </span>
  );
}
/** Compatibility for existing spinner callers, with the shared brand mark. */
export function ProgressSpinner({ className, style }: ProgressSpinnerProps) {
  return (
    <BrandLoader
      variant="inline"
      className={className}
      size={style?.width ?? 24}
      style={style}
    />
  );
}
export function NetworkActivity() {
  const visible = useSyncExternalStore(
    networkActivity.subscribe,
    networkActivity.getSnapshot,
    networkActivity.getServerSnapshot,
  );
  return visible ? (
    <div className={styles.notice} data-localsell-network-loader>
      <BrandLoader variant="compact" />
    </div>
  ) : null;
}
