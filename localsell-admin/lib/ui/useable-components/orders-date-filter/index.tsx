import { IDashboardDateFilterComponentsProps } from '@/lib/utils/interfaces/dashboard.interface';
import DateRangePicker from '../custom-date-range/range-picker';
export default function OrdersDashboardDateFilter({
  dateFilter,
  setDateFilter,
  className = '',
}: IDashboardDateFilterComponentsProps) {
  return (
    <div className={`ls-filter-toolbar ${className}`}>
      <DateRangePicker
        startDate={dateFilter.startDate ?? ''}
        endDate={dateFilter.endDate ?? ''}
        onChange={(startDate, endDate) =>
          setDateFilter({ dateKeyword: 'Custom', startDate, endDate })
        }
      />
    </div>
  );
}
