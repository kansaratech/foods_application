// Components
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';

// Hooks
import { useTranslations } from 'next-intl';

const OrdersSuperAdminHeader = () => {
  // Hooks
  const t = useTranslations();

  return (
    <ManagementHeading
      title={t('Orders')}
      description={t('track_orders_filter_activity_and_manage_fulfilment')}
    ></ManagementHeading>
  );
};

export default OrdersSuperAdminHeader;
