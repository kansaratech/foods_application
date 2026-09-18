import { IExtendedOrder } from '@/lib/utils/interfaces';
import { useTranslations } from 'next-intl';
const dateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: true,
};

export const ORDER_COLUMNS = () => {
  // Hooks
  const t = useTranslations();
  return [
    {
      headerName: t('Order ID'),
      propertyName: 'orderId',
    },
    {
      propertyName: 'itemsTitle',
      headerName: t('Items'),
    },
    {
      headerName: t('Payment'),
      propertyName: 'paymentMethod',
      body: (rowData: IExtendedOrder) => (
        <span>
          {rowData.paymentMethod}
          {rowData.paymentMethod === 'CASHFREE' ? ` (${rowData.paymentStatus})` : ''}
        </span>
      ),
    },
    {
      headerName: t('Order Status'),
      propertyName: 'orderStatus',
    },
    {
      headerName: t('Created At'),
      propertyName: 'DateCreated',
      body: (rowData: IExtendedOrder) => {
        const value = String(rowData?.createdAt ?? '');
        const date = new Date(/^\d+$/.test(value) ? Number(value) : value);
        return (
          <span>
            {Number.isNaN(date.getTime())
              ? '?'
              : date.toLocaleDateString('en-US', dateOptions)}
          </span>
        );
      },
    },
    {
      headerName: t('Delivery Address'),
      propertyName: 'OrderdeliveryAddress',
    },
  ];
};
