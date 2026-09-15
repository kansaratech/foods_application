import { ICustomTabProps } from '@/lib/utils/interfaces';
import OrdersDashboardDateFilter from '../orders-date-filter';
import { useTranslations } from 'next-intl';
import SegmentedControl from './segmented-control';
export default function CustomTab({
  options,
  selectedTab,
  setSelectedTab,
  dateFilter,
  setDateFilter,
}: ICustomTabProps) {
  const t = useTranslations();
  return (
    <div className="ls-tab-section">
      <SegmentedControl
        options={options}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
      />
      {(selectedTab === t('Custom') || selectedTab === t('custom')) &&
        dateFilter &&
        setDateFilter && (
          <OrdersDashboardDateFilter
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
          />
        )}
    </div>
  );
}
