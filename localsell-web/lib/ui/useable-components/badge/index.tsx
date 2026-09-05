import React from "react";

type BadgeVariant = "offer" | "festive" | "neutral";

interface IBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  offer: "bg-[#1c5bc7] text-white",
  festive: "bg-[#16293f] text-white",
  neutral: "bg-slate-900/85 text-white backdrop-blur-sm",
};

/**
 * Small pill badge for cards — "20% OFF", "Diwali Special", etc.
 * Matches the absolute-positioned pill recipe already used on the store card.
 */
export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: IBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
