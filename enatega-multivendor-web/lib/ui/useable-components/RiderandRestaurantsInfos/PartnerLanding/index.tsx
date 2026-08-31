"use client";

import Image, { StaticImageData } from "next/image";
import { ReactNode } from "react";
import { FiArrowDown, FiArrowRight, FiCheck } from "react-icons/fi";

import EmailForm from "@/lib/ui/useable-components/RiderandRestaurantsInfos/Form";

interface Benefit {
  heading: string;
  text: string;
  icon: ReactNode;
}

interface Step {
  title: string;
  copy: string;
}

interface Metric {
  value: string;
  label: string;
}

interface PartnerLandingProps {
  eyebrow: string;
  heading: string;
  accent: string;
  intro: string;
  image: StaticImageData;
  imageAlt: string;
  primaryCta: string;
  heroBadge: string;
  metrics: Metric[];
  benefitsEyebrow: string;
  benefitsHeading: string;
  benefitsIntro: string;
  benefits: Benefit[];
  stepsHeading: string;
  steps: Step[];
  form: {
    eyebrow: string;
    heading: string;
    role: string;
    subheading: string;
    bullets: string[];
  };
}

export default function PartnerLanding({
  eyebrow,
  heading,
  accent,
  intro,
  image,
  imageAlt,
  primaryCta,
  heroBadge,
  metrics,
  benefitsEyebrow,
  benefitsHeading,
  benefitsIntro,
  benefits,
  stepsHeading,
  steps,
  form,
}: PartnerLandingProps) {
  return (
    <main className="overflow-hidden bg-white text-slate-950 dark:bg-gray-900 dark:text-white">
      <section className="relative border-b border-slate-200 bg-[#fffaf5] dark:border-gray-800 dark:bg-gray-950">
        <div aria-hidden="true" className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-[#f5820a]/10 blur-3xl" />
        <div className="relative grid min-h-[650px] items-center gap-10 px-4 py-12 md:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 lg:py-16 xl:px-20 2xl:px-[80px]">
          <div className="relative z-10 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#f5820a]">{eyebrow}</p>
            <h1 className="mt-6 text-[42px] font-black leading-[0.98] tracking-[-0.05em] text-slate-950 dark:text-white sm:text-6xl xl:text-[72px]">
              {heading}
              <span className="mt-2 block font-serif text-[38px] font-normal italic leading-[1.04] tracking-[-0.035em] text-[#8c1d40] dark:text-orange-300 sm:text-[58px] xl:text-[66px]">{accent}</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 dark:text-gray-300 sm:text-lg">{intro}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-[#f5820a] px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(245,130,10,0.24)] transition hover:-translate-y-0.5 hover:bg-[#e8760a]">
                {primaryCta} <FiArrowRight aria-hidden="true" />
              </a>
              <a href="#how" className="inline-flex items-center gap-2 rounded-full border border-[#8c1d40]/30 bg-white px-6 py-3.5 text-sm font-bold text-[#8c1d40] transition hover:border-[#8c1d40] dark:bg-gray-900 dark:text-orange-300">
                See how it works <FiArrowDown aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[820px] lg:ml-auto">
            <div className="relative aspect-[1.3/1] overflow-hidden rounded-[2.25rem] rounded-tr-[7rem] shadow-[0_30px_80px_rgba(60,25,37,0.2)]">
              <Image src={image} alt={imageAlt} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 58vw" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-5 py-4 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:left-8">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5820a]/12 text-[#f5820a]"><FiCheck aria-hidden="true" /></span>
              <span><span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Padharo partner</span><span className="mt-0.5 block text-sm font-bold">{heroBadge}</span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid border-b border-slate-200 bg-white px-4 py-8 sm:grid-cols-3 md:px-6 lg:px-12 xl:px-20 2xl:px-[80px] dark:border-gray-800 dark:bg-gray-900">
        {metrics.map((metric, index) => (
          <div key={metric.label} className={`px-4 py-3 text-center ${index > 0 ? "sm:border-l sm:border-slate-200 dark:sm:border-gray-700" : ""}`}>
            <strong className="block text-2xl font-black tracking-[-0.03em] text-[#8c1d40] dark:text-orange-300">{metric.value}</strong>
            <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-gray-400">{metric.label}</span>
          </div>
        ))}
      </section>

      <section className="px-4 py-16 md:px-6 lg:px-12 lg:py-24 xl:px-20 2xl:px-[80px]">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#f5820a]">{benefitsEyebrow}</p>
            <h2 className="mt-4 text-4xl font-black leading-[1.04] tracking-[-0.04em] sm:text-5xl">{benefitsHeading}</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600 dark:text-gray-300">{benefitsIntro}</p>
          </div>
          <div className="grid gap-4">
            {benefits.map((benefit, index) => (
              <article key={benefit.heading} className="group grid gap-5 rounded-[1.75rem] border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-[#f5820a]/45 hover:shadow-[0_22px_55px_rgba(140,29,64,0.08)] sm:grid-cols-[64px_1fr_36px] sm:items-center sm:p-8 dark:border-gray-700 dark:bg-gray-800">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff3e7] text-xl text-[#f5820a] dark:bg-gray-700">{benefit.icon}</span>
                <div><h3 className="text-xl font-bold tracking-[-0.02em]">{benefit.heading}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">{benefit.text}</p></div>
                <span className="hidden text-right font-mono text-xs text-slate-300 sm:block">0{index + 1}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 bg-[#21191c] px-4 py-16 text-white md:px-6 lg:px-12 lg:py-24 xl:px-20 2xl:px-[80px]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#ffad55]">Simple onboarding</p><h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">{stepsHeading}</h2></div>
          <p className="max-w-sm text-sm leading-6 text-white/55">Clear steps, human support and everything you need to start confidently.</p>
        </div>
        <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-0">
          {steps.map((step, index) => (
            <li key={step.title} className="relative border-t border-white/15 pt-8 md:pr-10">
              <span className="absolute -top-3 left-0 grid h-6 w-6 place-items-center rounded-full border-2 border-[#f5820a] bg-[#21191c] text-[9px] font-bold text-[#ffad55]">{index + 1}</span>
              <h3 className="text-lg font-bold">{step.title}</h3><p className="mt-3 text-sm leading-6 text-white/55">{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#fffaf5] px-0 py-16 dark:bg-gray-950 lg:py-24">
        <EmailForm {...form} />
      </section>
    </main>
  );
}
