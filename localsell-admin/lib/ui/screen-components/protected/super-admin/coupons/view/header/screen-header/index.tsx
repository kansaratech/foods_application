//Components
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';

//Interfaces
import { ICouponScreenHeaderProps } from '@/lib/utils/interfaces/coupons.interface';

//Icons
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

export default function CouponScreenHeader({
  handleButtonClick,
}: ICouponScreenHeaderProps) {
  // Hooks
  const t = useTranslations();
  return (
    <ManagementHeading
      title={t('Coupons')}
      description={t('Create and manage promotional discounts for your customers.')}
    >
      <TextIconClickable
        className="rounded border dark:border-dark-600  border-gray-300 bg-black text-white sm:w-auto"
        icon={faAdd}
        iconStyles={{ color: 'white' }}
        onClick={handleButtonClick}
        title={t('Add Coupon')}
      />
    </ManagementHeading>
  );
}
