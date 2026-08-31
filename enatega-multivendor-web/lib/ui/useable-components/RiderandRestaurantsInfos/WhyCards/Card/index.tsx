import React from "react";
import { Cards } from "@/lib/utils/interfaces/Rider-restaurant.interface";
import Image from "@/lib/ui/useable-components/safe-image";

interface CardProps extends Cards {
  index?: number;
}

const Card: React.FC<CardProps> = ({ image, icon, heading, text, index }) => {
  return (
    <div className="group relative flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-7 transition hover:border-[#f5820a]/50 hover:shadow-[0_20px_50px_rgba(140,29,64,0.10)] dark:border-gray-700 dark:bg-gray-800">
      {typeof index === "number" && (
        <span className="absolute right-6 top-6 text-xs font-black tracking-[0.1em] text-slate-300 dark:text-gray-600">
          {String(index + 1).padStart(2, "0")}
        </span>
      )}

      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5820a]/10 text-[#c9620a] dark:bg-[#f5820a]/15 dark:text-[#f5943a]">
          {icon}
        </div>
      ) : (
        image && (
          <div className="relative flex h-16 w-16 items-center justify-center">
            <Image src={image} alt="" className="h-full w-full object-contain" />
          </div>
        )
      )}

      <h3 className="mt-6 text-lg font-bold tracking-[-0.01em] text-slate-950 dark:text-white">
        {heading}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">
        {text}
      </p>
    </div>
  );
};

export default Card;
