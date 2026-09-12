"use client";

import { NotificationSection, SettingsMain } from "@/lib/ui/screen-components/protected/profile/settings";

  export default function SettingsScreen() {
    return (
      <div data-profile-section="settings" className="flex flex-col gap-6">
      <SettingsMain/>
      <NotificationSection/>
      </div>
    );
  }