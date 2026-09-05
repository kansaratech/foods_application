// Components
import RiderHeader from '@/lib/ui/screen-components/protected/super-admin/riders/view/header/screen-header';
import RidersMain from '@/lib/ui/screen-components/protected/super-admin/riders/view/main';

export default function RidersScreen() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <RiderHeader />
      <RidersMain />
    </div>
  );
}
