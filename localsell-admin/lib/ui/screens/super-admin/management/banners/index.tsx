'use client';
import '@/lib/ui/useable-components/management-page/management.css';
import BannersHeader from '@/lib/ui/screen-components/protected/super-admin/banner/view/header/screen-header';
import BannersMain from '@/lib/ui/screen-components/protected/super-admin/banner/view/main';

export default function BannerScreen() {
  return (
    <div className="management-page management-banners">
      <BannersHeader />
      <BannersMain />
    </div>
  );
}
