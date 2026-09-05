import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import '@/lib/ui/useable-components/management-page/management.css';
// Components
import WaitlistMain from '@/lib/ui/screen-components/protected/super-admin/waitlist/view/main';
import { useTranslations } from 'next-intl';

export default function WaitlistScreen() {
  const t = useTranslations();
  return (
    <div className="management-page management-waitlist">
      <ManagementHeading
        title={t('Waitlist')}
        description={t('Review customer interest in areas awaiting service.')}
      />
      <WaitlistMain />
    </div>
  );
}
