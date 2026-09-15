'use client';

import {
  DataTable as PrimeDataTable,
  type DataTableProps,
  type DataTableValueArray,
} from 'primereact/datatable';

/** Both configured tables and custom column layouts use this paginator contract. */
export function DataTable<T extends DataTableValueArray>(
  props: DataTableProps<T>
) {
  const pageSizes = Array.from(new Set([props.rows ?? 10, 10, 25, 50])).sort(
    (a, b) => a - b
  );
  return (
    <PrimeDataTable<T>
      {...props}
      rowsPerPageOptions={pageSizes}
      paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
      currentPageReportTemplate="Showing {first}–{last} of {totalRecords}"
      className={`ls-data-table ${props.className ?? ''}`}
    />
  );
}
