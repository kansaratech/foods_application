"use client";
import { GetHelpMain } from "@/lib/ui/screen-components/protected/profile/get-help";

export default function GetHelpScreen() {
  return (
    <div data-profile-section="get-help" className="flex flex-col gap-6">
      <GetHelpMain />
    </div>
  );
}