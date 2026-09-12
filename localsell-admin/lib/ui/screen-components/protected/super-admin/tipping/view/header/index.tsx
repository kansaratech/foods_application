// Interface and Types

// Components
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import { useTranslations } from 'next-intl';

const TippingHeader = () => {
  // Hooks
  const t = useTranslations();

  return (
    <ManagementHeading
      title={t('Tipping')}
      description={t('set_the_suggested_tip_amounts_customers_see_at')}
    ></ManagementHeading>
  );
};

export default TippingHeader;
