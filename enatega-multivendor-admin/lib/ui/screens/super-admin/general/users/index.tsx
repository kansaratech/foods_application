'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { GET_USERS } from '@/lib/api/graphql/queries/user';
import { IUsersDataResponse } from '@/lib/utils/interfaces/users.interface';
import { USERS_TABLE_COLUMNS } from '@/lib/ui/useable-components/table/columns/user-columns';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { customerDate, customerMethod, customerStatus } from './utils';
import './customers.css';

export default function UsersScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery<IUsersDataResponse>(
    GET_USERS,
    { fetchPolicy: 'cache-and-network' }
  );
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [lastActive, setLastActive] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const users = useMemo(() => data?.users ?? [], [data]);
  const now = new Date();
  const filtered = users.filter((user) => {
    const term = search.trim().toLowerCase();
    const last = customerDate(user.lastLogin);
    return (
      (!term ||
        [user.name, user.email, user.phone].some((value) =>
          value?.toLowerCase().includes(term)
        )) &&
      (!method || customerMethod(user) === method) &&
      (!status || customerStatus(user) === status) &&
      (!lastActive ||
        (last &&
          last.getTime() <= now.getTime() &&
          last.getTime() >= now.getTime() - Number(lastActive) * 86400000))
    );
  });
  const exportCsv = () => {
    const cell = (value: unknown) => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = [
      [
        'Customer',
        'ID',
        'Email',
        'Phone',
        'Joined via',
        'Status',
        'Last active',
      ],
      ...filtered.map((u) => [
        u.name,
        u._id,
        u.email,
        u.phone,
        customerMethod(u),
        customerStatus(u),
        customerDate(u.lastLogin)?.toISOString(),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\ufeff' + rows.map((row) => row.map(cell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8;' }
      )
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const stats = [
    {
      label: 'Total customers',
      value: users.length,
      icon: 'users',
      tone: 'blue',
    },
    {
      label: 'Active customers',
      value: users.filter((u) => customerStatus(u) === 'Active').length,
      icon: 'user',
      tone: 'green',
    },
    {
      label: 'New this month',
      value: users.filter((u) => {
        const d = customerDate(u.createdAt);
        return (
          d &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }).length,
      icon: 'chart-bar',
      tone: 'blue',
    },
    {
      label: 'Blocked accounts',
      value: users.filter((u) => customerStatus(u) === 'Blocked').length,
      icon: 'ban',
      tone: 'red',
    },
  ];
  return (
    <div className="customers-page">
      <div className="customers-breadcrumb">
        General <span>/</span> Customers
      </div>
      <header className="customers-heading">
        <div>
          <h1>Customers</h1>
          <p>View customer activity, orders and account status</p>
        </div>
        <button
          className="customers-export"
          onClick={exportCsv}
          disabled={!filtered.length || loading}
        >
          <i className="pi pi-download" aria-hidden="true" />
          Export
        </button>
      </header>
      <div className="customers-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="customers-stat">
            <span className={`customers-stat-icon ${stat.tone}`}>
              <i className={`pi pi-${stat.icon}`} aria-hidden="true" />
            </span>
            <div>
              <p>{stat.label}</p>
              <strong>{loading && !data ? '?' : stat.value}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="customers-filters">
        <label className="customers-search">
          <i className="pi pi-search" aria-hidden="true" />
          <input
            aria-label="Search customers"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Registration method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="">Registration Method</option>
          {['Email', 'Google', 'Apple', 'Phone'].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="Account status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Account Status</option>
          {['Active', 'Inactive', 'Blocked'].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <label className="customers-date">
          <i className="pi pi-calendar" aria-hidden="true" />
          <select
            aria-label="Last active"
            value={lastActive}
            onChange={(e) => setLastActive(e.target.value)}
          >
            <option value="">Last active</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <button
          className="customers-clear"
          onClick={() => {
            setSearch('');
            setMethod('');
            setStatus('');
            setLastActive('');
          }}
        >
          Clear filters
        </button>
      </div>
      {error && (
        <div role="alert" className="mb-3 text-sm text-red-600">
          Unable to load customers.{' '}
          <button onClick={() => refetch()} className="underline">
            Try again
          </button>
        </div>
      )}
      <DataTable
        key={[search, method, status, lastActive].join('|')}
        value={filtered}
        loading={loading && !data}
        dataKey="_id"
        className="customers-table"
        paginator
        rows={8}
        rowsPerPageOptions={[8, 16, 24, 50]}
        tableStyle={{ minWidth: '62rem' }}
        removableSort
        paginatorTemplate="CurrentPageReport RowsPerPageDropdown PrevPageLink PageLinks NextPageLink"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} customers"
        emptyMessage="No customers match your filters."
        onRowClick={(event) => {
          if (
            !(event.originalEvent.target as HTMLElement).closest(
              'a, button, .customer-actions'
            )
          )
            router.push(`/general/users/user-detail/${event.data._id}`);
        }}
      >
        {USERS_TABLE_COLUMNS(openMenuId, setOpenMenuId).map((col) => (
          <Column
            key={col.propertyName}
            field={col.propertyName}
            header={col.headerName}
            body={col.body}
            sortable={
              !['actions', 'orders', 'totalSpent'].includes(col.propertyName)
            }
          />
        ))}
      </DataTable>
    </div>
  );
}
