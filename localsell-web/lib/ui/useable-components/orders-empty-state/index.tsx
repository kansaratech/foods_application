"use client";
import type { FC } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReceipt, faArrowRight } from "@fortawesome/free-solid-svg-icons";

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  actionLink?: string;
}

const EmptyState: FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  actionLink,
}) => (
  <div className="flex flex-col items-center justify-center px-5 py-12 text-center sm:py-16">
    <div
      aria-hidden="true"
      className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-light text-primary-color dark:bg-gray-800 dark:text-blue-400"
    >
      <FontAwesomeIcon icon={faReceipt} className="h-8 w-8" />
    </div>
    <h3 className="mb-2 text-xl font-semibold tracking-tight text-secondary-color dark:text-white">
      {title}
    </h3>
    <p className="mb-7 max-w-sm text-sm leading-6 text-slate-500 dark:text-gray-300">
      {message}
    </p>
    {actionLabel && actionLink && (
      <Link
        href={actionLink}
        className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-primary-color px-6 py-3 text-sm font-semibold text-white"
      >
        {actionLabel}
        <FontAwesomeIcon
          icon={faArrowRight}
          aria-hidden="true"
          className="h-3 w-3 rtl:rotate-180"
        />
      </Link>
    )}
  </div>
);

export default EmptyState;
