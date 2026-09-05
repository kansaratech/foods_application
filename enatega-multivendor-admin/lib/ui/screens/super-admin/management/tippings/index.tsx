import '@/lib/ui/useable-components/management-page/management.css';
//Components
import TippingAddForm from '@/lib/ui/screen-components/protected/super-admin/tipping/add-form/add-form';
import TippingHeader from '@/lib/ui/screen-components/protected/super-admin/tipping/view/header';

export default function TippingScreen() {
  return (
    <div className="management-page management-tippings">
      <TippingHeader />
      <TippingAddForm />
    </div>
  );
}
