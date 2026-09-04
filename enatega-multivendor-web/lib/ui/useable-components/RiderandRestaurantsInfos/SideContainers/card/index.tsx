import React from "react";
import Image from "@/lib/ui/useable-components/safe-image";
import { sideCardProps } from "@/lib/utils/interfaces/Rider-restaurant.interface";

const SideCard: React.FC<sideCardProps & { index?: number }> = ({
  image,
  heading,
  subHeading,
  right = true,
  index,
}) => {
  return (
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
      <div className={right ? "md:order-2" : "md:order-1"}>
        {typeof index === "number" && (
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1c5bc7]">
            {String(index + 1).padStart(2, "0")}
          </p>
        )}
        <h3 className="text-2xl font-black leading-tight tracking-[-0.02em] text-slate-950 dark:text-white sm:text-3xl">
          {heading}
        </h3>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-gray-300">
          {subHeading}
        </p>
      </div>
      <div className={right ? "md:order-1" : "md:order-2"}>
        <div className="relative h-[260px] w-full overflow-hidden rounded-[1.75rem] border border-slate-200 shadow-[0_20px_55px_rgba(15,23,42,0.10)] dark:border-gray-700 sm:h-[320px]">
          <Image
            src={image}
            alt={heading}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 520px"
          />
        </div>
      </div>
    </div>
  );
};

export default SideCard;
