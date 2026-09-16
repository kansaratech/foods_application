/* eslint-disable react-hooks/exhaustive-deps */
'use client';

// Core

// Context

// Components
import RestaurantAppTopbar from '@/lib/ui/screen-components/protected/layout/restaurant-layout/app-bar';
import RestaurantSidebar from '@/lib/ui/screen-components/protected/layout/restaurant-layout/side-bar';

// Interface
import { IProvider } from '@/lib/utils/interfaces';

const RestaurantLayout = ({ children }: IProvider) => {
  // Context

  return (
    <div className="layout-main">
      <div className="layout-top-container">
        <RestaurantAppTopbar />
      </div>
      <div className="layout-main-container">
        <div className="layout-sidebar relative left-0 z-50">
          <RestaurantSidebar />
        </div>
        <div className="layout-content dark:bg-dark-950 px-5">{children}</div>
      </div>
    </div>
  );
};

export default RestaurantLayout;
