import React from "react";

interface HeadingCta {
  label: string;
  href: string;
  variant?: "solid" | "outline";
}

interface HeadingProps {
  /** Kept for backwards compatibility — the main headline. */
  heading: string;
  /** Small uppercase label shown above the headline. */
  eyebrow?: string;
  /** Optional serif-italic phrase rendered on its own line under the headline. */
  accent?: string;
  subHeading?: string;
  ctas?: HeadingCta[];
}

const Heading: React.FC<HeadingProps> = ({
  heading,
  eyebrow,
  accent,
  subHeading,
  ctas,
}) => {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-12 text-center sm:pt-16">
      {eyebrow && (
        <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#1c5bc7]">
          {eyebrow}
        </p>
      )}
      <h1 className="text-balance text-[34px] font-black leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl lg:text-[56px]">
        {heading}
        {accent && (
          <span className="mt-2 block font-serif text-[30px] font-normal italic leading-tight tracking-[-0.03em] text-[#16293f] dark:text-blue-300 sm:text-[44px] lg:text-[52px]">
            {accent}
          </span>
        )}
      </h1>
      {subHeading && (
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 dark:text-gray-300 sm:text-lg">
          {subHeading}
        </p>
      )}
      {ctas && ctas.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {ctas.map((cta) => (
            <a
              key={cta.label}
              href={cta.href}
              className={
                cta.variant === "outline"
                  ? "rounded-full border border-[#16293f] px-6 py-3 text-sm font-bold text-[#16293f] transition hover:bg-[#16293f] hover:text-white dark:border-blue-300 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-gray-900"
                  : "rounded-full bg-[#1c5bc7] px-6 py-3 text-sm font-bold text-white transition hover:brightness-95"
              }
            >
              {cta.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default Heading;
