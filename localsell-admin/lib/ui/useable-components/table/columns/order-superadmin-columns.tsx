import { IExtendedOrder } from '@/lib/utils/interfaces';
import { useConfiguration } from '@/lib/hooks/useConfiguration';
export const ORDER_SUPER_ADMIN_COLUMNS = () => {
  const { CURRENCY_SYMBOL } = useConfiguration();
  return [
    {
      headerName: 'Order',
      propertyName: 'orderId',
      body: (row: IExtendedOrder) => (
        <div className="orders-cell">
          <strong>{row.orderId}</strong>
          <small title={row._id}>#{row._id.slice(-6)}</small>
        </div>
      ),
    },
    {
      headerName: 'Customer',
      propertyName: 'user.name',
      body: (row: IExtendedOrder) => (
        <div className="orders-cell">
          <strong>{row.user?.name || '?'}</strong>
          <small>{row.user?.phone || '?'}</small>
        </div>
      ),
    },
    {
      headerName: 'Items',
      propertyName: 'items',
      body: (row: IExtendedOrder) => (
        <span>
          {row.items?.length ?? 0}{' '}
          {(row.items?.length ?? 0) === 1 ? 'item' : 'items'}
        </span>
      ),
    },
    { headerName: 'Payment', propertyName: 'paymentMethod' },
    {
      headerName: 'Status',
      propertyName: 'orderStatus',
      body: (row: IExtendedOrder) => {
        const labels: Record<string, string> = {
          PENDING: 'Pending',
          ACCEPTED: 'Accepted',
          ASSIGNED: 'Assigned',
          PICKED: 'Picked up',
          DELIVERED: 'Delivered',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled',
        };
        return (
          <span className={`orders-status ${row.orderStatus?.toLowerCase()}`}>
            {labels[row.orderStatus] || row.orderStatus}
          </span>
        );
      },
    },
    {
      headerName: 'Placed at',
      propertyName: 'createdAt',
      body: (row: IExtendedOrder) => {
        const value = String(row.createdAt ?? '');
        const date = new Date(/^\d+$/.test(value) ? Number(value) : value);
        return Number.isNaN(date.getTime())
          ? '?'
          : date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
      },
    },
    {
      headerName: 'Restaurant',
      propertyName: 'restaurant.name',
      body: (row: IExtendedOrder) => row.restaurant?.name || '?',
    },
    {
      headerName: 'Delivery',
      propertyName: 'deliveryMode',
      body: (row: IExtendedOrder) => {
        const mode = row.deliveryMode || (row.isPickedUp ? 'PICKUP' : 'PLATFORM');
        if (mode === 'PICKUP') return 'Pickup';
        if (mode === 'SELF') return `Store${row.storeDeliveryAgent?.name ? ` · ${row.storeDeliveryAgent.name}` : ''}`;
        return 'LocalSell fleet';
      },
    },
    {
      headerName: 'Rider',
      propertyName: 'rider.name',
      body: (row: IExtendedOrder) => row.rider?.name || 'Unassigned',
    },
    {
      headerName: 'Total',
      propertyName: 'orderAmount',
      body: (row: IExtendedOrder) => (
        <strong>
          {CURRENCY_SYMBOL}
          {Number(row.orderAmount ?? 0).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
        </strong>
      ),
    },
    {
      headerName: 'Actions',
      propertyName: 'actions',
      body: (row: IExtendedOrder) => (
        <button
          type="button"
          className="orders-row-action"
          aria-label={`View order ${row.orderId}`}
          title="View order details"
        >
          <i className="pi pi-ellipsis-v" aria-hidden="true" />
        </button>
      ),
    },
  ];
};
