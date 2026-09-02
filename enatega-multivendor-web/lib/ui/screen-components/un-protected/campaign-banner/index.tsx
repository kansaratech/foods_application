"use client";

import DiscoveryBannerSection from "@/lib/ui/screen-components/protected/home/discovery/banner-section";

/**
 * Festival-campaign banner slot. Same implementation as the discovery banner,
 * parameterised by where it's shown so the landing page and store pages can
 * carry their own scheduled campaigns.
 */
export default function CampaignBanner({
  placement,
}: {
  placement: "HOME" | "STORE" | "LANDING";
}) {
  return <DiscoveryBannerSection placement={placement} />;
}
