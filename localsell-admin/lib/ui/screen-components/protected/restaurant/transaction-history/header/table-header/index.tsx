// Prime React
import { InputText } from 'primereact/inputtext';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';

// Interfaces
import { ITransactionHistoryTableHeaderProps } from '@/lib/utils/interfaces';

// Hooks
import { useTranslations } from 'next-intl';

export default function TransactionHistoryStoreTableHeader({
  globalFilterValue,
  onGlobalFilterChange,
  dateFilters,
  setDateFilters,
}: ITransactionHistoryTableHeaderProps) {
  // Hooks
  const t = useTranslations();

  // States

  // Handlers
  return (
    <div className="ls-filter-toolbar ls-filter-toolbar-inline">
      <div className="ls-filter-group">
        <DateRangePicker
          startDate={dateFilters.startingDate || ''}
          endDate={dateFilters.endingDate || ''}
          showLabel={false}
          allowClear
          placeholder="All time"
          onChange={(startingDate, endingDate) =>
            setDateFilters((prev) => ({ ...prev, startingDate, endingDate }))
          }
        />
      </div>
      <div className="flex">
        <span className="p-input-icon-left">
          <i className="pi pi-search pl-2" />
          <InputText
            className="w-[14rem] h-10 border-[1px] border-gray-300 rounded-[0.3rem] pl-7 pr-3 text-black dark:text-white"
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t('Search here')}
          />
        </span>
      </div>
    </div>
  );
}
