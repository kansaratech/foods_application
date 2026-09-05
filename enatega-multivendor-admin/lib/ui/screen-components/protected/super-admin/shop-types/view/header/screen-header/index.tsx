//Components
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';

//Interfaces
import { IShopTypesScreenHeaderProps } from '@/lib/utils/interfaces';

//Icons
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

export default function ShopTypeScreenHeader({
  handleButtonClick,
}: IShopTypesScreenHeaderProps) {
  // Hooks
  const t = useTranslations();
  return (
    <ManagementHeading
      title={t('ShopType')}
      description="Manage the categories available to stores on your platform."
    >
      <TextIconClickable
        className="rounded border-gray-300 border dark:border-dark-600 bg-black text-white sm:w-auto"
        icon={faAdd}
        iconStyles={{ color: 'white' }}
        onClick={handleButtonClick}
        title={t('AddShopType')}
      />
    </ManagementHeading>
  );
}
