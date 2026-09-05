import '@/lib/ui/useable-components/custom-multi-select/multi-select.css';
import { IOrderSuperAdminHeaderProps } from '@/lib/utils/interfaces';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';

export default function OrderSuperAdminTableHeader(
  props: IOrderSuperAdminHeaderProps & {
    onExport: () => void;
    exporting: boolean;
  }
) {
  return (
    <div className="orders-toolbar management-toolbar">
      <label className="orders-search">
        <i className="pi pi-search" aria-hidden="true" />
        <input
          aria-label="Search orders"
          placeholder="Search by order ID or customer"
          value={props.globalFilterValue}
          onChange={props.onGlobalFilterChange}
        />
      </label>
      <nav className="orders-date-tabs" aria-label="Order date range">
        {['All', 'Today', 'Week', 'Month', 'Year', 'Custom'].map((value) => (
          <button
            type="button"
            key={value}
            aria-current={
              props.dateFilter.dateKeyword === value ? 'page' : undefined
            }
            onClick={() =>
              props.handleDateFilter({
                ...props.dateFilter,
                dateKeyword: value,
              })
            }
          >
            {value}
          </button>
        ))}
      </nav>
      <MultiSelect
        panelClassName="custom-multiselect-panel"
        aria-label="Order status"
        value={props.selectedActions}
        options={[
          'PENDING',
          'ACCEPTED',
          'ASSIGNED',
          'PICKED',
          'DELIVERED',
          'COMPLETED',
          'CANCELLED',
        ].map((value) => ({
          label: value.charAt(0) + value.slice(1).toLowerCase(),
          value,
        }))}
        onChange={(e) => props.setSelectedActions(e.value)}
        placeholder="Status"
        maxSelectedLabels={1}
        selectedItemsLabel="{0} statuses"
        showClear
      />
      <Dropdown
        aria-label="Restaurant"
        value={props.selectedRestaurantId}
        options={props.restaurants}
        optionLabel="name"
        optionValue="_id"
        onChange={(e) => props.setSelectedRestaurantId(e.value ?? null)}
        placeholder="Restaurant"
        filter
        showClear
        loading={props.filtersLoading}
      />
      <Dropdown
        aria-label="Rider"
        value={props.selectedRiderId}
        options={props.riders}
        optionLabel="name"
        optionValue="_id"
        onChange={(e) => props.setSelectedRiderId(e.value ?? null)}
        placeholder="Rider"
        filter
        showClear
        loading={props.filtersLoading}
      />
      <button
        type="button"
        className="orders-export"
        onClick={props.onExport}
        disabled={props.exporting}
      >
        <i
          className={`pi pi-${props.exporting ? 'spin pi-spinner' : 'upload'}`}
          aria-hidden="true"
        />
        Export
      </button>
    </div>
  );
}
