import React from "react";
import Card from "../Card";
import {
  Cards,
  WhyCardsListProps,
} from "@/lib/utils/interfaces/Rider-restaurant.interface";

const WhyCardsList: React.FC<WhyCardsListProps> = ({ eyebrow, title, cards }) => {
  return (
    <div className="mx-auto max-w-5xl px-4">
      {(eyebrow || title) && (
        <div className="mb-9 text-center">
          {eyebrow && (
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#f5820a]">
              {eyebrow}
            </p>
          )}
          {title && (
            <h2 className="text-3xl font-black tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">
              {title}
            </h2>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item: Cards, i) => (
          <Card
            key={item.heading}
            index={i}
            image={item.image}
            icon={item.icon}
            heading={item.heading}
            text={item.text}
          />
        ))}
      </div>
    </div>
  );
};

export default WhyCardsList;
