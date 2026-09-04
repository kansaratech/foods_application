"use client";

import Link from "next/link";
import { FiArrowRight, FiBriefcase, FiSmartphone } from "react-icons/fi";
import { TbScooter } from "react-icons/tb";

import Start from "../../screen-components/un-protected/Home/Start";
import PopularStores from "../../screen-components/un-protected/Home/PopularStores";
import ServiceAreas from "../../screen-components/un-protected/Home/ServiceAreas";
import CampaignBanner from "../../screen-components/un-protected/campaign-banner";

const benefits = [
  { icon: FiSmartphone, title: "For customers", copy: "A smooth, reliable experience from discovery to doorstep.", href: "/discovery" },
  { icon: FiBriefcase, title: "For businesses", copy: "Tools to grow, manage and delight your customers.", href: "/restaurantInfo" },
  { icon: TbScooter, title: "For riders", copy: "Flexible earning with clear support every step.", href: "/rider" },
];

export default function Main() {
  return (
    <main className="w-full overflow-x-hidden bg-white text-slate-950 dark:bg-gray-900 dark:text-white">
      <Start />

      <CampaignBanner placement="LANDING" />

      <section className="bg-white py-8 dark:bg-gray-900 lg:py-14">
        <div className="relative grid w-full items-stretch px-4 md:px-6 lg:grid-cols-[25%_repeat(3,1fr)] lg:px-0">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden h-[128px] w-full text-[#16293f] lg:block"
            viewBox="0 0 1920 128"
            preserveAspectRatio="none"
          >
            <path
              d="M0 127 H410 C452 127 477 102 477 64 C477 25 500 1 540 1 H1920"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="relative z-10 flex min-h-[128px] items-center border-b-2 border-r-2 border-[#16293f] px-6 py-7 lg:border-0 lg:px-[5vw]">
            <h2 className="whitespace-nowrap text-3xl font-medium tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
              More than{" "}
              <span className="font-serif font-normal italic text-[#16293f] dark:text-blue-300">delivery.</span>
            </h2>
          </div>

          {benefits.map((item) => (
            <Link key={item.title} href={item.href} className="group relative z-10 grid min-h-[128px] grid-cols-[48px_1fr_24px] items-center gap-4 border-b border-slate-200 px-5 py-6 transition hover:bg-[#fff7ef]/70 lg:border-b-0 lg:px-7 xl:grid-cols-[52px_1fr_28px] xl:px-10 dark:border-gray-700 dark:hover:bg-gray-800">
              <span aria-hidden="true" className="absolute -top-[6px] left-[28%] hidden h-[14px] w-[14px] rounded-full border-[3px] border-[#16293f] bg-white lg:block dark:bg-gray-900" />
              <item.icon aria-hidden="true" className="h-8 w-8 text-[#1c5bc7]" strokeWidth={1.7} />
              <span>
                <span className="block text-sm font-bold text-slate-950 dark:text-white">{item.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-gray-300">{item.copy}</span>
              </span>
              <FiArrowRight aria-hidden="true" className="h-5 w-5 text-slate-900 transition group-hover:translate-x-1 group-hover:text-[#1c5bc7] dark:text-white" />
            </Link>
          ))}
        </div>
      </section>

      <section className="w-full border-b border-slate-200 bg-white px-4 py-14 dark:border-gray-800 dark:bg-gray-900 md:px-6 lg:px-12 lg:py-16 xl:px-20 2xl:px-[80px]">
        <ServiceAreas />
      </section>
      <PopularStores />
    </main>
  );
}
