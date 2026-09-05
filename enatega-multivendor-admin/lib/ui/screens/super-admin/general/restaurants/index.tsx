'use client';
import RestaurantsScreenHeader from '@/lib/ui/screen-components/protected/super-admin/restaurants/view/header/screen-header';
import RestaurantsScreenSubHeader from '@/lib/ui/screen-components/protected/super-admin/restaurants/view/header/screen-sub-header';
import RestaurantsMain from '@/lib/ui/screen-components/protected/super-admin/restaurants/view/main';

export default function RestaurantsScreen() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <RestaurantsScreenHeader />
      <RestaurantsScreenSubHeader />
      <RestaurantsMain />
    </div>
  );
}
