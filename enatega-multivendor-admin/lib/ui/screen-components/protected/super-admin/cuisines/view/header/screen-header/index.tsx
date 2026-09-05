// Components
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';

// Interfaces
import { ICuisineScreenHeaderProps } from '@/lib/utils/interfaces/cuisine.interface';

// Icons
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

export default function CuisineScreenHeader({
  handleButtonClick,
}: ICuisineScreenHeaderProps) {
  // Hooks
  const t = useTranslations();

  return (
    <ManagementHeading
      title={t('Cuisines')}
      description="Organize cuisines and help customers discover their next meal."
    >
      <TextIconClickable
        icon={faAdd}
        iconStyles={{ color: 'white' }}
        onClick={handleButtonClick}
        title={t('Add Cuisines')}
        className="rounded border-gray-300 border dark:border-dark-600 bg-black text-white sm:w-auto"
      />
    </ManagementHeading>
  );
}
