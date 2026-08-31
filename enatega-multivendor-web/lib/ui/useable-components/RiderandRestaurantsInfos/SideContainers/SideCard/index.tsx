import React from "react";
import SideCard from "../card";
import { sideCardList } from "@/lib/utils/interfaces/Rider-restaurant.interface";

const SideContainers: React.FC<sideCardList> = ({ sideCards }) => {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 sm:gap-20">
      {sideCards?.map((item, i) => (
        <SideCard
          key={item.heading}
          index={i}
          image={item.image}
          heading={item.heading}
          subHeading={item.subHeading}
          right={item.right}
        />
      ))}
    </div>
  );
};

export default SideContainers;
