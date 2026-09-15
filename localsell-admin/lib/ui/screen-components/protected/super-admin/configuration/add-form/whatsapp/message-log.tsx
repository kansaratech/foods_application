'use client';
import Select from '@/lib/ui/useable-components/custom-dropdown/select';

import { useState } from 'react';
import { useQuery } from '@apollo/client';

import { GET_WHATSAPP_MESSAGE_LOGS } from '@/lib/api/graphql';

interface ILogRow {
  _id: string;
  createdAt: string;
  toPhone: string;
  userType?: string | null;
  channel: string;
  purpose: string;
  templateKey?: string | null;
  metaMessageId?: string | null;
  status: string;
  errorCode?: string | null;
  errorDetail?: string | null;
}

const STATUS_TONE: Record<string, string> = {
  QUEUED: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
  READ: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  FALLBACK: 'bg-amber-100 text-amber-800',
};

const DAYS_OPTIONS = [
  { label: '24 hours', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const PAGE_SIZE = 20;

function fmt(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WhatsAppMessageLog() {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState('');
  const [purpose, setPurpose] = useState('');
  const [channel, setChannel] = useState('');
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');

  const { data, loading, error, refetch } = useQuery(
    GET_WHATSAPP_MESSAGE_LOGS,
    {
      variables: {
        page,
        limit: PAGE_SIZE,
        days,
        status: status || undefined,
        purpose: purpose || undefined,
        channel: channel || undefined,
        search: search || undefined,
      },
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      skip: !open,
    }
  );

  const result = data?.whatsappMessageLogs;
  const rows: ILogRow[] = result?.logs ?? [];
  const totalCount: number = result?.totalCount ?? 0;
  const totalPages: number = result?.totalPages ?? 1;

  const resetTo = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const selectClass =
    'h-9 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-dark-600 dark:bg-dark-950 dark:text-white';

  return (
    <div className="configuration-card configuration-message-log">
      <div className="configuration-card-heading">
        <div className="configuration-log-title">
          <span className="configuration-log-icon">
            <i className="pi pi-whatsapp" aria-hidden="true" />
          </span>
          <div>
            <h2>WhatsApp message log</h2>
            <p>Track outgoing messages and their delivery status.</p>
          </div>
        </div>
        <button
          type="button"
          className="configuration-log-toggle"
          aria-expanded={open}
          aria-controls="whatsapp-message-log-body"
          onClick={() => setOpen((v) => !v)}
        >
          <i
            className={`pi pi-chevron-${open ? 'up' : 'down'}`}
            aria-hidden="true"
          />
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {open && (
        <div
          className="configuration-card-body"
          id="whatsapp-message-log-body"
          aria-busy={loading}
        >
          {/* Filters */}
          <div className="configuration-log-filters">
            <label className="flex flex-col text-xs font-medium text-gray-500">
              Date range
              <Select
                className={selectClass}
                value={days}
                onChange={(e) => resetTo(() => setDays(Number(e.value)))}
              >
                {DAYS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col text-xs font-medium text-gray-500">
              Status
              <Select
                className={selectClass}
                value={status}
                onChange={(e) => resetTo(() => setStatus(e.value))}
              >
                <option value="">All statuses</option>
                {(result?.statuses ?? []).map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col text-xs font-medium text-gray-500">
              Purpose
              <Select
                className={selectClass}
                value={purpose}
                onChange={(e) => resetTo(() => setPurpose(e.value))}
              >
                <option value="">All purposes</option>
                {(result?.purposes ?? []).map((p: string) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col text-xs font-medium text-gray-500">
              Channel
              <Select
                className={selectClass}
                value={channel}
                onChange={(e) => resetTo(() => setChannel(e.value))}
              >
                <option value="">All channels</option>
                {(result?.channels ?? []).map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </label>

            <form
              className="configuration-log-search"
              onSubmit={(e) => {
                e.preventDefault();
                resetTo(() => setSearch(searchDraft.trim()));
              }}
            >
              <label className="flex flex-col text-xs font-medium text-gray-500">
                Search messages
                <input
                  className={`${selectClass} w-56`}
                  placeholder="Phone, template or message ID"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </label>
              <button type="submit" className="configuration-save">
                <i className="pi pi-search" aria-hidden="true" />
                Search
              </button>
              {(search || status || purpose || channel) && (
                <button
                  type="button"
                  className={`${selectClass} px-3`}
                  onClick={() =>
                    resetTo(() => {
                      setSearch('');
                      setSearchDraft('');
                      setStatus('');
                      setPurpose('');
                      setChannel('');
                    })
                  }
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Table */}
          {rows.length > 0 && !error && (
            <div className="overflow-x-auto">
              <table className="ls-native-table w-full text-left text-sm">
                <thead className="text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">To</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Purpose</th>
                    <th className="py-2 pr-4">Template</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r._id}
                      className="border-t border-gray-100 align-top dark:border-gray-800"
                    >
                      <td className="whitespace-nowrap py-2 pr-4">
                        {fmt(r.createdAt)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs">
                        {r.toPhone}
                      </td>
                      <td className="py-2 pr-4">{r.userType ?? '—'}</td>
                      <td className="py-2 pr-4">{r.purpose}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.templateKey ?? '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            STATUS_TONE[r.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(error || rows.length === 0) && (
            <div
              className="configuration-log-empty"
              role={error ? 'alert' : 'status'}
            >
              <span className="configuration-log-empty-icon">
                <i
                  className={`pi ${loading ? 'pi-spin pi-spinner' : error ? 'pi-exclamation-circle' : 'pi-inbox'}`}
                  aria-hidden="true"
                />
              </span>
              <h3>
                {loading
                  ? 'Loading messages...'
                  : error
                    ? 'Unable to load messages'
                    : 'No messages found'}
              </h3>
              <p>
                {loading
                  ? 'Fetching your recent message activity.'
                  : error
                    ? 'Please try again to load your message activity.'
                    : 'Try a different date range or adjust your filters to find messages.'}
              </p>
              {error && !loading && (
                <button
                  type="button"
                  className="configuration-log-toggle"
                  onClick={() => void refetch().catch(() => {})}
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {/* Pager */}
          {totalCount > 0 && !error && (
            <div className="configuration-log-pager">
              <span>
                {totalCount === 0
                  ? 'No results'
                  : `Page ${result?.currentPage ?? page} of ${totalPages} · ${totalCount} messages`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`${selectClass} px-3 disabled:opacity-40`}
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={`${selectClass} px-3 disabled:opacity-40`}
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
