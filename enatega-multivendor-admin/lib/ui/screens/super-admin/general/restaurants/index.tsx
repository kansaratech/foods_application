'use client';
import RestaurantsMain from '@/lib/ui/screen-components/protected/super-admin/restaurants/view/main';
import './stores.css';

export default function RestaurantsScreen() {
  return (
    <div className="stores-page h-full min-h-0 overflow-y-auto">
      <RestaurantsMain />
    </div>
  );
}
