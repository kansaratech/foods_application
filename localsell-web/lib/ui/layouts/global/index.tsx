"use client";

import { useEffect } from "react";

import AppHeader from "@/lib/ui/screen-components/un-protected/layout/app-header";
import AppFooter from "@/lib/ui/screen-components/un-protected/layout/app-footer";
import InstallPrompt from "@/lib/ui/pwa/InstallPrompt";

// Interface & Types
import { IProvider } from "@/lib/utils/interfaces";

// Google OAuth
import { useConfig } from "@/lib/context/configuration/configuration.context";
import { GoogleMapsProvider } from "@/lib/context/global/google-maps.context";
import AuthModal from "@/lib/ui/screen-components/un-protected/authentication";
import CashfreeOrderRecovery from "../../screens/protected/order/cashfree-order-recovery";

// Search Context
import { useSearchUI } from "@/lib/context/search/search.context";

// Hooks
import { useAuth } from "@/lib/context/auth/auth.context";

const AppLayout = ({ children }: IProvider) => {
  // One header on every route — landing, discovery, store, checkout, profile.
  // AppHeader carries the Localsell chrome + the working cart sidebar, delivery-
  // location picker and profile menu.

  // Hooks
  const { isAuthModalVisible, setIsAuthModalVisible, setActivePanel } =
    useAuth();
  const { isSearchFocused } = useSearchUI();

  // Hook
  const { GOOGLE_MAPS_KEY, LIBRARIES } = useConfig();

  const handleModalToggle = () => {
    setIsAuthModalVisible((prev) => {
      if (prev) {
        setActivePanel(0);
      }
      return !prev;
    });
  };

  const UI = (
    <div className="layout-main min-h-screen w-full flex-col">
      <AppHeader />
      <div
        className={`layout-main-container ${isSearchFocused && "blur-md overflow-hidden h-screen "}`}
      >
        {/* No min-h-screen here — the outer .layout-main already covers the
            viewport; stacking a second one under it forced this div alone to
            be a full 100vh even on short pages, pushing AppFooter far below
            the fold and leaving a dead white gap under short content. */}
        <div className="layout-main w-full min-w-0 flex-col dark:bg-gray-900">
          <CashfreeOrderRecovery />
          {children}
        </div>
      </div>
      <AppFooter />
      <InstallPrompt />
      <AuthModal
        handleModalToggle={handleModalToggle}
        isAuthModalVisible={isAuthModalVisible}
      />
    </div>
  );

  useEffect(() => {}, [GOOGLE_MAPS_KEY]);

  return GOOGLE_MAPS_KEY ? (
    <GoogleMapsProvider apiKey={GOOGLE_MAPS_KEY} libraries={LIBRARIES}>
      <>{UI}</>
    </GoogleMapsProvider>
  ) : (
    <>{UI}</>
  );
};

export default AppLayout;
