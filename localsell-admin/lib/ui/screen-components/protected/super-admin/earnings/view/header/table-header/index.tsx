import ActionButton from '@/lib/ui/useable-components/button/action-button';
import { InputText } from 'primereact/inputtext';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';
import { Dropdown } from 'primereact/dropdown';
import {
  IQueryResult,
  IStoreRidersResponse,
  UserTypeEnum,
} from '@/lib/utils/interfaces';
import { useMemo, useState } from 'react';
import {
  IEarningTableHeaderProps,
  OrderTypeEnum,
  PaymentMethodEnum,
} from '@/lib/utils/interfaces/';
import { useTranslations } from 'use-intl';

import { useQueryGQL } from '@/lib/hooks/useQueryQL';

import { GET_STORE_RIDER } from '@/lib/api/graphql/queries/concurrent';

export default function EarningTableHeader({
  globalFilterValue,
  onGlobalFilterChange,
  dateFilters,
  setDateFilters,
  onClearFilters,
}: IEarningTableHeaderProps) {
  const [userType, setUserType] = useState<UserTypeEnum>();
  // Hooks
  const t = useTranslations();

  // Query
  const { data } = useQueryGQL(GET_STORE_RIDER, {
    fetchPolicy: 'cache-and-network',
  }) as IQueryResult<IStoreRidersResponse | undefined, undefined>;

  const storesDropdown = useMemo(
    () =>
      data?.restaurants?.map((store) => {
        return { label: store.name, value: store._id };
      }),
    [data?.restaurants]
  );

  const ridersDropdown = useMemo(
    () =>
      data?.riders.map((rider) => {
        return { label: rider.name, value: rider._id };
      }),
    [data?.riders]
  );

  // Constants
  const userTypes = [
    { label: t('All'), value: UserTypeEnum.ALL },
    { label: t('Rider'), value: UserTypeEnum.RIDER },
    { label: t('Store'), value: UserTypeEnum.STORE },
  ];

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

  // Handlers
  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between  ">
      <div className="ls-filter-group">
        <span className="p-input-icon-left w-full md:w-auto">
          <i className="pi pi-search pl-2" />
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
          options={userTypes}
          value={userType}
          onChange={(e) => {
            if (e.value === UserTypeEnum.ALL) {
              setDateFilters((prev) => ({
                ...prev,
                userType: e.value,
                userId: undefined,
              }));
            } else {
              setUserType(e.value);
            }
          }}
          placeholder={`${t('Select')} ${t('User')} ${t('Type')}`}
        />

        {userType !== undefined && userType !== 'ALL' && (
          <Dropdown
            className="w-[14rem] h-10 border-[1px] border-gray-300 rounded-[0.3rem] pl-3 pr-3 text-sm"
            options={userType === 'RIDER' ? ridersDropdown : storesDropdown}
            value={dateFilters.userId}
            onChange={(e) =>
              setDateFilters((prev) => ({ ...prev, userType, userId: e.value }))
            }
            placeholder={t('Select User ID')}
          />
        )}

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
          placeholder={t(`${t('Select')} ${t('Payment Method')}`)}
        />
        <ActionButton
          variant="secondary"
          onClick={onClearFilters}
          className="max-w-32 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-sm rounded h-10 transition-colors "
          type="button"
        >
          {t('Reset')}
        </ActionButton>
      </div>
    </div>
  );
}
