import { InputText } from 'primereact/inputtext';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';
import { Dropdown } from 'primereact/dropdown';
import { ITransactionHistoryTableHeaderProps } from '@/lib/utils/interfaces';
import { useTranslations } from 'next-intl';

export default function TransactionHistoryTableHeader({
  globalFilterValue,
  onGlobalFilterChange,
  dateFilters,
  setDateFilters,
}: ITransactionHistoryTableHeaderProps) {
  // Hooks
  const t = useTranslations();

  // States

  const userTypes = [
    { label: t('All'), value: 'ALL' },
    { label: t('Rider'), value: 'RIDER' },
    { label: t('Store'), value: 'STORE' },
  ];

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
        <div className="ls-filter-group">
          <Dropdown
            className="w-[14rem] h-10 border-[1px] border-gray-300 rounded-[0.3rem]  text-black dark:text-white"
            options={userTypes}
            value={dateFilters.userType || null}
            onChange={(e) =>
              setDateFilters((prev) => ({
                ...prev,
                userType: e.value,
              }))
            }
            placeholder={`${t('Select')} ${t('User')} ${t('Type')}`}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <span className="p-input-icon-left">
          <i className="pi pi-search pl-2" />
          <InputText
            className="w-[14rem] h-10 border-[1px] font-light border-gray-300 rounded-[0.3rem] pl-7 pr-3 text-black dark:text-white"
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t('Search')}
          />
        </span>
      </div>
    </div>
  );
}
