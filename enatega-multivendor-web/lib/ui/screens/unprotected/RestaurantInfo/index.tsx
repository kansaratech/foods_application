"use client";

import { FiBarChart2, FiShoppingBag, FiTruck } from "react-icons/fi";

import PartnerLanding from "@/lib/ui/useable-components/RiderandRestaurantsInfos/PartnerLanding";
import restaurantBanner from "@/public/assets/images/png/restaurant-banner.png";

export default function RestInfo() {
  return (
    <PartnerLanding
      eyebrow="Partner with LocalSell"
      heading="Your kitchen deserves"
      accent="a bigger neighbourhood."
      intro="Bring your menu online, reach customers across Deogarh and grow every service—while LocalSell takes care of the delivery journey."
      image={restaurantBanner}
      imageAlt="Restaurant kitchen ready to serve LocalSell customers"
      primaryCta="List your restaurant"
      heroBadge="Ready for more orders"
      metrics={[
        { value: "₹0", label: "Upfront joining fee" },
        { value: "30 min", label: "Typical local delivery" },
        { value: "100%", label: "Control over your menu" },
      ]}
      benefitsEyebrow="Built for local businesses"
      benefitsHeading="More reach. Less operational weight."
      benefitsIntro="A practical partnership that helps independent restaurants sell online without building their own delivery operation."
      benefits={[
        { heading: "Grow with local demand", text: "Get discovered by customers already searching for meals, groceries and essentials around them.", icon: <FiBarChart2 /> },
        { heading: "Own your storefront", text: "Manage your menu, pricing, categories, add-ons and promotions from one straightforward merchant experience.", icon: <FiShoppingBag /> },
        { heading: "We handle the last mile", text: "Accept the order and prepare it. LocalSell riders manage pickup, live movement and delivery to the customer.", icon: <FiTruck /> },
      ]}
      stepsHeading="From your kitchen to customers in three steps."
      steps={[
        { title: "Share your business details", copy: "Submit the short application with your restaurant, contact and verification information." },
        { title: "Build your digital menu", copy: "Our onboarding team helps you configure products, pricing, availability and service hours." },
        { title: "Open your store", copy: "Go online, accept incoming orders and let the LocalSell delivery network take it from there." },
      ]}
      form={{
        eyebrow: "Become a restaurant partner",
        heading: "Let’s grow your restaurant",
        role: "Vendor registration",
        subheading: "Tell us about your business and our local onboarding team will contact you with the next steps.",
        bullets: ["No upfront joining fee", "Full control of your menu and pricing", "Local onboarding support", "Delivery handled by LocalSell riders"],
      }}
    />
  );
}
