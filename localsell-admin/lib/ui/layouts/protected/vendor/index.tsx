/* eslint-disable react-hooks/exhaustive-deps */
'use client';

// Core

// Context

// Components
import VendorAppTopbar from '@/lib/ui/screen-components/protected/layout/vendor-layout/app-bar';
import VendorSidebar from '@/lib/ui/screen-components/protected/layout/vendor-layout/side-bar';

// Interface
import { IProvider } from '@/lib/utils/interfaces';

const VendorLayout = ({ children }: IProvider) => {
  // Context

  return (
    <div className="layout-main">
      <div className="layout-top-container">
        <VendorAppTopbar />
      </div>
      <div className="layout-main-container">
        <div className="layout-sidebar relative left-0 z-50">
          <VendorSidebar />
        </div>
        <div className="layout-content dark:bg-dark-950">{children}</div>
      </div>
    </div>
  );
};

export default VendorLayout;
