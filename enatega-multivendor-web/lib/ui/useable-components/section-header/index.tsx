"use client";

import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";

/**
 * Shared Discovery/listing section header — matches the marketing landing page
 * design language (uppercase tracked eyebrow, tight-tracked display heading with
 * an optional serif-italic accent word, subtle circular nav controls).
 */
interface SectionHeaderProps {
  title: string;
  /** serif-italic accent phrase rendered right after the title */
  accent?: string;
  eyebrow?: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  onPrev?: () => void;
  onNext?: () => void;
  showNav?: boolean;
  isRTL?: boolean;
  className?: string;
}

export default function SectionHeader({
  title,
  accent,
  eyebrow,
  onSeeAll,
  seeAllLabel = "See all",
  onPrev,
  onNext,
  showNav = false,
  isRTL = false,
  className = "",
}: SectionHeaderProps) {
  const NavIcon = isRTL
    ? { prev: FiChevronRight, next: FiChevronLeft }
    : { prev: FiChevronLeft, next: FiChevronRight };

  return (
    <div
      className={`mb-4 flex items-end justify-between gap-4 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500 sm:text-[11px] sm:tracking-[0.28em]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[22px] font-black leading-[1.12] tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[26px]">
          {title}
          {accent ? (
            <span className="font-serif text-[22px] font-normal italic tracking-[-0.02em] text-[#8c1d40] dark:text-orange-300 sm:text-[26px]">
              {" "}
              {accent}
            </span>
          ) : null}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onSeeAll ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="group inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-bold text-[#8c1d40] transition hover:text-[#f5820a] dark:text-orange-300"
          >
            {seeAllLabel}
            <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </button>
        ) : null}

        {showNav && (onPrev || onNext) ? (
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Previous"
              onClick={onPrev}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[#f5820a] hover:text-[#f5820a] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <NavIcon.prev className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={onNext}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[#f5820a] hover:text-[#f5820a] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <NavIcon.next className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
