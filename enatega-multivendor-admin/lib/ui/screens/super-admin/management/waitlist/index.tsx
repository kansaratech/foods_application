import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import '@/lib/ui/useable-components/management-page/management.css';
// Components
import WaitlistMain from '@/lib/ui/screen-components/protected/super-admin/waitlist/view/main';

export default function WaitlistScreen() {
  return (
    <div className="management-page management-waitlist">
      <ManagementHeading
        title="Waitlist"
        description="Review customer interest in areas awaiting service."
      />
      <WaitlistMain />
    </div>
  );
}
