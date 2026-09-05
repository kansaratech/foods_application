import { useRouter } from 'next/navigation';
import { IRestaurantResponse } from '@/lib/utils/interfaces';

export type StoreListRow = IRestaurantResponse & {
  city?: string;
  state?: string;
  approvalStatus?: string;
  zone?: { _id: string; title?: string };
  documentSummary?: {
    required: number;
    verified: number;
    pending: number;
    rejected: number;
  };
};

type Props = {
  stores: StoreListRow[];
  exportStores: StoreListRow[];
  clonedCount: number;
  loading: boolean;
  view: string;
  onViewChange: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  zone: string;
  approval: string;
  availability: string;
  category: string;
  onZone: (value: string) => void;
  onApproval: (value: string) => void;
  onAvailability: (value: string) => void;
  onCategory: (value: string) => void;
  onClear: () => void;
};

export default function StoresOverview(props: Props) {
  const router = useRouter();
  const pending = props.stores.filter(
    (s) => s.approvalStatus === 'PENDING'
  ).length;
  const incomplete = props.stores.filter(
    (s) =>
      s.documentSummary &&
      s.documentSummary.verified < s.documentSummary.required
  ).length;
  const zones = Array.from(
    new Map(
      props.stores.filter((s) => s.zone).map((s) => [s.zone!._id, s.zone!])
    ).values()
  );
  const categories = Array.from(
    new Set(props.stores.map((s) => s.shopType).filter(Boolean))
  ).sort();
  const exportCsv = () => {
    const cell = (value: unknown) => {
      let text = String(value ?? '');
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = [
      ['Store', 'ID', 'Vendor', 'Location', 'Approval', 'Availability'],
      ...props.exportStores.map((s) => [
        s.name,
        s._id,
        s.owner?.email,
        s.address,
        s.approvalStatus,
        s.isActive ? 'Live' : 'Offline',
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
    link.download = 'stores.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <div className="stores-breadcrumb">
        General <span>/</span> <strong>Stores</strong>
      </div>
      <header className="stores-heading">
        <div>
          <h1>Stores</h1>
          <p>Manage store approvals, setup and availability</p>
        </div>
        <div className="stores-heading-actions">
          <button
            className="stores-button"
            onClick={exportCsv}
            disabled={props.loading || !props.exportStores.length}
          >
            <i className="pi pi-download" aria-hidden="true" /> Export
          </button>
          <button
            className="stores-button primary"
            onClick={() => router.push('/general/stores/create')}
          >
            <i className="pi pi-plus" aria-hidden="true" /> Add store
          </button>
        </div>
      </header>
      <div className="stores-stats">
        {[
          {
            label: 'Total stores',
            value: props.stores.length,
            icon: 'shop',
            tone: 'blue',
          },
          {
            label: 'Live',
            value: props.stores.filter((s) => s.isActive).length,
            icon: 'circle-fill',
            tone: 'green',
          },
          {
            label: 'Pending approval',
            value: pending,
            icon: 'clock',
            tone: 'amber',
          },
          {
            label: 'Setup incomplete',
            value: incomplete,
            icon: 'cog',
            tone: 'slate',
          },
        ].map((stat) => (
          <div className="stores-stat" key={stat.label}>
            <span className={`stores-stat-icon ${stat.tone}`}>
              <i className={`pi pi-${stat.icon}`} aria-hidden="true" />
            </span>
            <div>
              <p>{stat.label}</p>
              <strong>{props.loading ? '?' : stat.value}</strong>
            </div>
          </div>
        ))}
      </div>
      <nav className="stores-tabs" aria-label="Store views">
        {[
          ['all', 'All stores', props.stores.length],
          ['pending', 'Pending approval', pending],
          ['incomplete', 'Setup incomplete', incomplete],
          ['cloned', 'Cloned stores', props.clonedCount],
        ].map(([value, label, count]) => (
          <button
            key={value}
            aria-current={props.view === value ? 'page' : undefined}
            className={props.view === value ? 'active' : ''}
            onClick={() => props.onViewChange(String(value))}
          >
            {label}
            <span>{props.loading ? '?' : count}</span>
          </button>
        ))}
      </nav>
      <div className="stores-filters">
        <label className="stores-search">
          <i className="pi pi-search" aria-hidden="true" />
          <input
            aria-label="Search stores"
            placeholder="Search by store, vendor or location..."
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Zone"
          value={props.zone}
          onChange={(e) => props.onZone(e.target.value)}
        >
          <option value="">All zones</option>
          {zones.map((z) => (
            <option key={z._id} value={z._id}>
              {z.title || z._id}
            </option>
          ))}
        </select>
        <select
          aria-label="Approval"
          value={props.approval}
          onChange={(e) => props.onApproval(e.target.value)}
        >
          <option value="">All approvals</option>
          {['APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'].map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select
          aria-label="Availability"
          value={props.availability}
          onChange={(e) => props.onAvailability(e.target.value)}
        >
          <option value="">All availability</option>
          <option value="live">Live</option>
          <option value="offline">Offline</option>
        </select>
        <select
          aria-label="Category"
          value={props.category}
          onChange={(e) => props.onCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button className="stores-button clear" onClick={props.onClear}>
          Clear filters
        </button>
      </div>
    </>
  );
}
