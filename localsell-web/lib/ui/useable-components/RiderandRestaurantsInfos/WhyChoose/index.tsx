import React from "react";

interface WhyChooseProps {
  eyebrow?: string;
  heading: string;
  subHeading: string;
}

const WhyChoose: React.FC<WhyChooseProps> = ({ eyebrow, heading, subHeading }) => {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 text-center">
      {eyebrow && (
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1c5bc7]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">
        {heading}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-gray-300 sm:text-lg">
        {subHeading}
      </p>
    </div>
  );
};

export default WhyChoose;
