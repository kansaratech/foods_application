// Interface and Types
import { IBannersHeaderComponentsProps } from '@/lib/utils/interfaces/banner.interface';

// Components
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';

// Icons
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

const BannersHeader = ({
  setIsAddBannerVisible,
}: IBannersHeaderComponentsProps) => {
  // Hooks
  const t = useTranslations();
  return (
    <ManagementHeading
      title={t('Banners')}
      description="Manage promotional banners and their destinations."
    >
      <TextIconClickable
        className="rounded border dark:border-dark-600 border-gray-300 bg-black  text-white  sm:w-auto"
        icon={faAdd}
        iconStyles={{ color: 'currentColor' }}
        title={t('Add Banner')}
        onClick={() => setIsAddBannerVisible(true)}
      />
    </ManagementHeading>
  );
};

export default BannersHeader;
