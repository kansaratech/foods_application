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
      description="Track orders, filter activity and manage fulfilment."
    ></ManagementHeading>
  );
};

export default OrdersSuperAdminHeader;
