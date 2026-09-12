"use client";

import ProfileHeader from "@/lib/ui/screen-components/protected/layout/profile/profile-header";
import ProfileTabs from "@/lib/ui/screen-components/protected/layout/profile/profile-tabs";
import styles from "./profile.module.css";
import { IProtectedProfileLayoutComponent } from "@/lib/utils/interfaces";
// import { usePathname, useRouter } from "next/navigation";

export default function ProfileLayout({
  children,
}: IProtectedProfileLayoutComponent) {
  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <ProfileHeader />
        <ProfileTabs />
      </div>
      <div className={styles.content}>
        {/* Scrollable Content */}
        <>{children}</>
      </div>
    </div>
  );
}
