import { IDashboardDateFilterComponentsProps } from '@/lib/utils/interfaces/dashboard.interface';
import OrdersDashboardDateFilter from '../orders-date-filter';
export default function DashboardDateFilter(
  props: IDashboardDateFilterComponentsProps
) {
  return props.dateFilter.dateKeyword === 'Custom' ? (
    <OrdersDashboardDateFilter {...props} />
  ) : null;
}
