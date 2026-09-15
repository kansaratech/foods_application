import ActionButton from '@/lib/ui/useable-components/button/action-button';
import { InputText } from 'primereact/inputtext';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';
import { Dropdown } from 'primereact/dropdown';
import {
  IEarningTableHeaderProps,
  OrderTypeEnum,
  PaymentMethodEnum,
} from '@/lib/utils/interfaces/earnings.interface';
import { useTranslations } from 'next-intl';

export default function EarningRestaurantTableHeader({
  globalFilterValue,
  onGlobalFilterChange,
  dateFilters,
  setDateFilters,
  onClearFilters,
}: IEarningTableHeaderProps) {
  // Hooks
  const t = useTranslations();

  // States

  const orderTypes = [
    { label: t('All'), value: OrderTypeEnum.ALL },
    { label: t('Delivery'), value: OrderTypeEnum.RIDER },
    { label: t('Pickup'), value: OrderTypeEnum.STORE },
  ];

  const paymentTypes = [
    { label: t('All'), value: PaymentMethodEnum.ALL },
    { label: t('COD'), value: PaymentMethodEnum.COD },
    { label: t('PayPal'), value: PaymentMethodEnum.PAYPAL },
    { label: t('Stripe'), value: PaymentMethodEnum.STRIPE },
  ];

  return (
    <div className="ls-filter-toolbar ls-filter-toolbar-inline">
      <div className="ls-filter-group">
        <span className="p-input-icon-left w-full md:w-auto">
          <i className="pi pi-search ml-2" />
          <InputText
            className="w-[14rem] h-10 border-[1px] border-gray-300 rounded-[0.3rem] pl-7 pr-3"
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t('Search')}
          />
        </span>
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
        <Dropdown
          className="w-[14rem] h-10 border-[1px] border-gray-300 rounded-[0.3rem] pl-3 pr-3 text-sm"
          options={orderTypes}
          value={dateFilters.orderType}
          onChange={(e) =>
            setDateFilters((prev) => ({ ...prev, orderType: e.value }))
          }
          placeholder={`${t('Select')} ${t('Order')} ${t('Type')}`}
        />
        <Dropdown
          className="w-[14rem] h-10 border-[1px] border-gray-300 rounded-[0.3rem] pl-3 pr-3 text-sm"
          options={paymentTypes}
          value={dateFilters.paymentMethod}
          onChange={(e) =>
            setDateFilters((prev) => ({ ...prev, paymentMethod: e.value }))
          }
          placeholder={`${t('Select')} ${t('Payment Method')})`}
        />
        <ActionButton
          variant="secondary"
          onClick={onClearFilters}
          className="max-w-32  px-4 py-2 dark:bg-dark-900 dark:text-white  dark:border dark:border-dark-600 bg-gray-200 hover:bg-gray-300 text-sm rounded h-10 transition-colors "
          type="button"
        >
          {t('Reset')}
        </ActionButton>
      </div>
    </div>
  );
}
