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
      description="Set the suggested tip amounts customers see at checkout."
    ></ManagementHeading>
  );
};

export default TippingHeader;
