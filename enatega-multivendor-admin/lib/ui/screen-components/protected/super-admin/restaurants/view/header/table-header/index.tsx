// Custom Components
import CustomTextField from '@/lib/ui/useable-components/input-field';

// Interfaces
import { IRestaurantsTableHeaderProps } from '@/lib/utils/interfaces';
import { useTranslations } from 'next-intl';

export default function RestaurantsTableHeader({
  globalFilterValue,
  onGlobalFilterChange,
}: IRestaurantsTableHeaderProps) {
  // Hooks
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('All Stores')}</h2>
        <p className="mt-0.5 text-xs font-normal text-slate-500">Manage store information, approvals and availability</p>
      </div>
        <div className="w-full sm:w-80">
          <CustomTextField
            type="text"
            name="vendorFilter"
            maxLength={35}
            showLabel={false}
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t('Search by store, vendor or email')}
            className="h-10"
          />
        </div>
    </div>
  );
}
