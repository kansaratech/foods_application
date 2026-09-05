'use client';

// Core
import { useState } from 'react';

// Component
import VendorHeader from '@/lib/ui/screen-components/protected/super-admin/vendor/view/header';
import VendorMain from '@/lib/ui/screen-components/protected/super-admin/vendor/view/main';
import VendorMobilesTabs from '@/lib/ui/screen-components/protected/super-admin/vendor/view/mobile-tabs';

// Constants
import { options } from '@/lib/utils/constants';

// Interface & Type
import { TVendorMobileTabs } from '@/lib/utils/types';

export default function VendorsScreen() {
  // States
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>(
    options[1]
  );
  const [selectedRestaurantFilter, setSelectedResturantFilter] =
    useState<string>(options[1]);
  const [activeTab, setActiveTab] = useState<TVendorMobileTabs>('vendors');

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden dark:bg-dark-950">
      <VendorHeader
      // selectedVendorFilter={selectedVendorFilter}
      // setSelectedVendorFilter={setSelectedVendorFilter}
      />

      <VendorMobilesTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <VendorMain
        // States
        activeTab={activeTab}
        selectedVendorFilter={selectedVendorFilter}
        selectedRestaurantFilter={selectedRestaurantFilter}
        // State Function
        setActiveTab={setActiveTab}
        setSelectedResturantFilter={setSelectedResturantFilter}
        setSelectedVendorFilter={setSelectedVendorFilter}
      />
    </div>
  );
}
