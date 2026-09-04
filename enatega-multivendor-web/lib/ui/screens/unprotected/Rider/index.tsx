"use client";

import { FiClock, FiMap, FiTrendingUp } from "react-icons/fi";

import PartnerLanding from "@/lib/ui/useable-components/RiderandRestaurantsInfos/PartnerLanding";
import riderBanner from "@/public/assets/images/png/riderBanner.webp";

export default function Rider() {
  return (
    <PartnerLanding
      eyebrow="Ride with LocalSell"
      heading="Your city. Your time."
      accent="Your way to earn."
      intro="Join Deogarh’s local delivery network, choose when you ride and earn by delivering food, groceries and everyday essentials nearby."
      image={riderBanner}
      imageAlt="LocalSell delivery rider ready for a local delivery"
      primaryCta="Become a rider"
      heroBadge="Flexible work, local routes"
      metrics={[
        { value: "Flexible", label: "Choose when you go online" },
        { value: "Local", label: "Short Deogarh routes" },
        { value: "Clear", label: "Trip earnings upfront" },
      ]}
      benefitsEyebrow="Designed around riders"
      benefitsHeading="Work that fits around your life."
      benefitsIntro="Simple tools, transparent trip information and a local support team help you focus on completing deliveries safely."
      benefits={[
        { heading: "Earn on every completed trip", text: "Review the delivery information before accepting and track your completed work from the rider app.", icon: <FiTrendingUp /> },
        { heading: "Choose your own hours", text: "Go online when it suits you—ride regularly or fit deliveries around another job or commitment.", icon: <FiClock /> },
        { heading: "Stay close to home", text: "Pickups and drops stay within Deogarh and nearby service zones, supported by clear in-app navigation.", icon: <FiMap /> },
      ]}
      stepsHeading="Start riding without the runaround."
      steps={[
        { title: "Send your application", copy: "Share your contact details using the form below. Previous delivery experience is not required." },
        { title: "Complete verification", copy: "Our team reviews your documents and helps set up your LocalSell rider account." },
        { title: "Go online and deliver", copy: "Choose your availability, accept a nearby request and earn for each completed trip." },
      ]}
      form={{
        eyebrow: "Become a rider",
        heading: "Ready for your first trip?",
        role: "Rider registration",
        subheading: "Tell us a little about yourself. Our rider team will contact you and guide you through onboarding.",
        bullets: ["Flexible working hours", "Clear trip information", "Local delivery routes", "Support while you are on a delivery"],
      }}
    />
  );
}
