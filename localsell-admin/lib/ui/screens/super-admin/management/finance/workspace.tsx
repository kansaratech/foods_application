'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { InputText } from 'primereact/inputtext';
import { usePathname } from 'next/navigation';
import Table from '@/lib/ui/useable-components/table';
import ActionButton from '@/lib/ui/useable-components/button/action-button';
import FieldShell from '@/lib/ui/useable-components/form/field-shell';
import FormDialog from '@/lib/ui/useable-components/form/form-dialog';
import Select from '@/lib/ui/useable-components/custom-dropdown/select';
import DateRangePicker from '@/lib/ui/useable-components/custom-date-range/range-picker';
import CustomDateInput from '@/lib/ui/useable-components/date-input';
import { dateString } from '@/lib/ui/useable-components/date-input/calendar';
import useToast from '@/lib/hooks/useToast';
import {
  GET_COMMISSION_PERIOD_PREVIEW,
  CLOSE_COMMISSION_PERIOD,
} from '@/lib/api/graphql';
import CommissionSettingsPanel from '@/lib/ui/screen-components/protected/super-admin/commission-rate/settings-panel';
import CommissionRateMain from '@/lib/ui/screen-components/protected/super-admin/commission-rate/view/main';
import {
  COLLECTION_OVERVIEW,
  COLLECTION_BILLS,
  COLLECTION_DETAIL,
  COLLECTION_RECEIPTS,
  RECORD_COLLECTION,
  VENDOR_PAYABLES,
  RECORD_VENDOR_PAYOUT,
  Bill,
  Receipt,
  VendorPayable,
  money,
  day,
} from './operations';
import './workspace.css';

type BillingRow = {
  _id: string;
  vendor: { _id: string; name?: string; email?: string };
  orderCount: number;
  grossFoodSubtotal: number;
  commissionTotal: number;
};
type CommissionOrder = {
  _id: string;
  orderNumber: string;
  storeName?: string;
  orderDeliveredAt: string;
  foodSubtotal: number;
  commissionRate: number;
  commissionAmount: number;
};
const base = '/management/finance';
const pages = [
  ['Overview', base],
  ['Collect commission', `${base}/collections`],
  ['Generate bills', `${base}/billing`],
  ['Vendor payables', `${base}/payables`],
  ['Receipts', `${base}/receipts`],
  ['Commission settings', `${base}/settings`],
];
export function FinanceFrame({
  title,
  description,
  children,
  vendor = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  vendor?: boolean;
}) {
  const pathname = usePathname();
  return (
    <main className="finance-workspace">
      <div className="finance-breadcrumb">
        <Link href={vendor ? '/admin/vendor/commission' : base}>Finance</Link>
        <span>/</span>
        <span>{title}</span>
      </div>
      <header className="finance-page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {!vendor && (
        <nav className="finance-page-nav" aria-label="Finance pages">
          {pages.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
      <div className="finance-page-body">{children}</div>
    </main>
  );
}
function Failure({
  error,
  retry,
}: {
  error?: { message: string };
  retry: () => unknown;
}) {
  return error ? (
    <div className="finance-error" role="alert">
      {error.message}
      <ActionButton variant="secondary" onClick={() => retry()}>
        Retry
      </ActionButton>
    </div>
  ) : null;
}
function Status({ bill }: { bill: Bill }) {
  const label =
    bill.status === 'PAID'
      ? 'Paid'
      : bill.status === 'WAIVED'
        ? 'Waived'
        : (bill.paidAmount ?? 0) > 0
          ? 'Part paid'
          : 'Unpaid';
  return (
    <span
      className={`finance-status finance-status-${bill.status.toLowerCase()}`}
    >
      {label}
    </span>
  );
}
function BillTable({
  bills,
  loading = false,
  onCollect,
  pagination,
  vendor = false,
}: {
  bills: Bill[];
  loading?: boolean;
  onCollect?: (b: Bill) => void;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    onPage: (page: number, limit: number) => void;
  };
  vendor?: boolean;
}) {
  return (
    <Table
      data={bills}
      loading={loading}
      minWidth="62rem"
      rowsPerPage={pagination?.limit ?? 10}
      currentPage={pagination?.page}
      totalRecords={pagination?.total}
      onPageChange={pagination?.onPage}
      columns={[
        {
          propertyName: 'invoiceNumber',
          headerName: 'Invoice',
          style: { minWidth: '15rem' },
          body: (b: Bill) => (
            <Link
              className="finance-table-link"
              href={
                vendor
                  ? `/admin/vendor/commission/${b._id}`
                  : `${base}/bills/${b._id}`
              }
            >
              {b.invoiceNumber || b._id}
            </Link>
          ),
        },
        ...(!vendor
          ? [
              {
                propertyName: 'vendor',
                headerName: 'Vendor',
                body: (b: Bill) => (
                  <div>
                    <strong>{b.vendor?.name || 'Vendor'}</strong>
                    <small>{b.vendor?.email}</small>
                  </div>
                ),
              },
            ]
          : []),
        {
          propertyName: 'periodEnd',
          headerName: 'Period',
          body: (b: Bill) => (
            <span>
              {day(b.periodStart)} / {day(b.periodEnd)}
            </span>
          ),
        },
        {
          propertyName: 'commissionTotal',
          headerName: 'Commission',
          align: 'right',
          body: (b: Bill) => money(b.commissionTotal),
        },
        {
          propertyName: 'paidAmount',
          headerName: 'Received',
          align: 'right',
          body: (b: Bill) => money(b.paidAmount),
        },
        {
          propertyName: 'outstandingAmount',
          headerName: 'Outstanding',
          align: 'right',
          body: (b: Bill) => <strong>{money(b.outstandingAmount)}</strong>,
        },
        {
          propertyName: 'status',
          headerName: 'Status',
          body: (b: Bill) => <Status bill={b} />,
        },
        ...(onCollect
          ? [
              {
                propertyName: 'action',
                headerName: 'Action',
                body: (b: Bill) =>
                  b.outstandingAmount > 0 ? (
                    <ActionButton onClick={() => onCollect(b)}>
                      Record payment
                    </ActionButton>
                  ) : (
                    <Link
                      className="finance-table-link"
                      href={`${base}/bills/${b._id}`}
                    >
                      View details
                    </Link>
                  ),
              },
            ]
          : []),
      ]}
    />
  );
}
function ReceiptTable({
  receipts,
  loading = false,
  total,
  page = 1,
  limit = 25,
  onPage,
  vendor = false,
}: {
  receipts: Receipt[];
  loading?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  onPage?: (p: number, l: number) => void;
  vendor?: boolean;
}) {
  return (
    <Table
      data={receipts}
      loading={loading}
      minWidth="58rem"
      rowsPerPage={limit}
      currentPage={page}
      totalRecords={total}
      onPageChange={onPage}
      columns={[
        {
          propertyName: 'receiptNumber',
          headerName: 'Receipt',
          body: (r: Receipt) => (
            <Link
              className="finance-table-link"
              href={`${vendor ? '/admin/vendor/commission' : `${base}/bills`}/${r.billId}#receipt-${r._id}`}
            >
              {r.receiptNumber}
            </Link>
          ),
        },
        {
          propertyName: 'receivedAt',
          headerName: 'Received on',
          body: (r: Receipt) => day(r.receivedAt),
        },
        {
          propertyName: 'vendor',
          headerName: 'Vendor',
          body: (r: Receipt) => r.vendor?.name || r.vendor?.email || '-',
        },
        {
          propertyName: 'amount',
          headerName: 'Amount',
          align: 'right',
          body: (r: Receipt) => <strong>{money(r.amount)}</strong>,
        },
        {
          propertyName: 'method',
          headerName: 'Method',
          body: (r: Receipt) => r.method.replace('_', ' '),
        },
        {
          propertyName: 'reference',
          headerName: 'Reference',
          body: (r: Receipt) => r.reference || 'Cash receipt',
        },
      ]}
    />
  );
}
function PaymentDialog({
  bill,
  onHide,
  onSaved,
}: {
  bill: Bill | null;
  onHide: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(''),
    [method, setMethod] = useState('UPI'),
    [reference, setReference] = useState(''),
    [note, setNote] = useState(''),
    [date, setDate] = useState(dateString(new Date())),
    [error, setError] = useState('');
  const [requestKey] = useState(() => crypto.randomUUID());
  const [record, { loading }] = useMutation(RECORD_COLLECTION);
  const { showToast } = useToast();
  return (
    <FormDialog
      visible={Boolean(bill)}
      onHide={() => {
        if (!loading) onHide();
      }}
      title="Record commission payment"
      subtitle="Record money already received from the vendor. This does not initiate a transfer."
      size="md"
    >
      {bill && (
        <form
          className="finance-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            const value = Number(amount);
            if (
              !Number.isFinite(value) ||
              value <= 0 ||
              value > bill.outstandingAmount
            ) {
              setError(
                'Enter an amount greater than zero and no more than the outstanding balance.'
              );
              return;
            }
            try {
              await record({
                variables: {
                  billId: bill._id,
                  amount: value,
                  method,
                  reference: reference.trim(),
                  note,
                  receivedAt: `${date}T00:00:00+05:30`,
                  idempotencyKey: requestKey,
                },
              });
              showToast({
                type: 'success',
                title: 'Payment recorded',
                message: 'Receipt saved and outstanding balance updated.',
              });
              onSaved();
              onHide();
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <div className="finance-callout">
            <strong>{bill.vendor?.name || bill.vendor?.email}</strong>
            <span>{bill.invoiceNumber}</span>
            <span>
              Outstanding <b>{money(bill.outstandingAmount)}</b>
            </span>
          </div>
          <div className="finance-form-grid">
            <FieldShell
              htmlFor="collection-amount"
              label="Amount received (INR)"
              required
            >
              <InputText
                id="collection-amount"
                className="ls-field"
                type="number"
                min="0.01"
                max={bill.outstandingAmount}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FieldShell>
            <FieldShell htmlFor="collection-method" label="Payment method">
              <Select
                inputId="collection-method"
                value={method}
                onChange={(e) => setMethod(e.value)}
              >
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CASH">Cash</option>
              </Select>
            </FieldShell>
            <CustomDateInput
              name="collection-date"
              placeholder="Received on"
              showLabel
              value={date}
              onChange={setDate}
            />
            <FieldShell
              htmlFor="collection-reference"
              label={
                method === 'CASH'
                  ? 'Reference (optional)'
                  : 'Transaction reference'
              }
              required={method !== 'CASH'}
            >
              <InputText
                id="collection-reference"
                className="ls-field"
                required={method !== 'CASH'}
                maxLength={150}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </FieldShell>
          </div>
          <FieldShell htmlFor="collection-note" label="Note (optional)">
            <textarea
              id="collection-note"
              className="ls-field p-inputtextarea"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FieldShell>
          {error && (
            <p className="finance-error" role="alert">
              {error}
            </p>
          )}
          <div className="finance-form-actions">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={onHide}
              disabled={loading}
            >
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save payment & receipt'}
            </ActionButton>
          </div>
        </form>
      )}
    </FormDialog>
  );
}
export function FinanceOverview() {
  const { data, loading, error, refetch } = useQuery(COLLECTION_OVERVIEW, {
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.commissionCollectionOverview;
  return (
    <FinanceFrame
      title="Finance overview"
      description="Track commission earned from stores, collect outstanding bills and keep a receipt for every payment."
    >
      <div className="finance-money-flow">
        <i className="pi pi-info-circle" />
        <p>
          <strong>Payments go directly to stores.</strong> LocalSell collects
          only its commission from the vendor. Store delivery and customer
          payments are managed by the store.
        </p>
      </div>
      <Failure error={error} retry={refetch} />
      <div className="finance-metrics">
        {[
          [
            'Outstanding commission',
            summary?.outstanding,
            'Billed and still to collect',
          ],
          [
            'Unbilled commission',
            summary?.unbilled,
            'Delivered orders awaiting a bill',
          ],
          [
            'Commission received',
            summary?.collected,
            'Recorded collections to date',
          ],
        ].map(([label, value, help]) => (
          <section key={String(label)}>
            <span>{label}</span>
            <strong>
              {loading && !summary ? '...' : money(value as number)}
            </strong>
            <small>{help}</small>
          </section>
        ))}
      </div>
      <div className="finance-tasks">
        {[
          [
            'Collect commission',
            'Find unpaid bills and record a payment.',
            'collections',
            'pi-wallet',
          ],
          [
            'Generate bills',
            'Review delivered orders and create vendor bills.',
            'billing',
            'pi-file',
          ],
          [
            'View receipts',
            'Look up received payments and references.',
            'receipts',
            'pi-check-circle',
          ],
        ].map(([title, desc, route, icon]) => (
          <Link key={route} href={`${base}/${route}`}>
            <i className={`pi ${icon}`} />
            <h2>{title}</h2>
            <p>{desc}</p>
            <span>
              Open <i className="pi pi-arrow-right" />
            </span>
          </Link>
        ))}
      </div>
      <section className="finance-section">
        <header>
          <div>
            <h2>Needs collection</h2>
            <p>
              {summary?.openBills ?? 0} open bills across{' '}
              {summary?.vendorsOwing ?? 0} vendors. Oldest bills first.
            </p>
          </div>
          <Link href={`${base}/collections`}>View all bills</Link>
        </header>
        <BillTable
          bills={summary?.pendingBills ?? []}
          loading={loading && !summary}
        />
      </section>
    </FinanceFrame>
  );
}
export function FinanceCollections() {
  const [status, setStatus] = useState('PENDING'),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(25),
    [range, setRange] = useState({ startDate: '', endDate: '' }),
    [selected, setSelected] = useState<Bill | null>(null);
  const { data, loading, error, refetch } = useQuery(COLLECTION_BILLS, {
    variables: {
      status: status || undefined,
      search: search || undefined,
      page,
      limit,
      startDate: range.startDate || undefined,
      endDate: range.endDate || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });
  return (
    <FinanceFrame
      title="Collect commission"
      description="Open a vendor bill to review its orders. Record a payment only after the money reaches LocalSell."
    >
      <div className="ls-filter-toolbar">
        <InputText
          aria-label="Search invoices or vendors"
          placeholder="Search invoice or vendor"
          className="ls-field ls-filter-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="Bill status"
          value={status}
          onChange={(e) => {
            setStatus(e.value);
            setPage(1);
          }}
        >
          <option value="PENDING">Unpaid & part paid</option>
          <option value="PAID">Paid</option>
          <option value="WAIVED">Waived</option>
          <option value="">All bills</option>
        </Select>
        <DateRangePicker
          {...range}
          label="Bill issue dates"
          placeholder="All issue dates"
          showLabel={false}
          allowClear
          onChange={(startDate, endDate) => {
            setRange({ startDate, endDate });
            setPage(1);
          }}
        />
        <ActionButton
          variant="secondary"
          onClick={() => {
            setSearch('');
            setRange({ startDate: '', endDate: '' });
            setStatus('PENDING');
            setPage(1);
          }}
        >
          Reset
        </ActionButton>
      </div>
      <Failure error={error} retry={refetch} />
      <BillTable
        bills={data?.commissionBills.bills ?? []}
        loading={loading && !data}
        onCollect={setSelected}
        pagination={{
          total: data?.commissionBills.total ?? 0,
          page,
          limit,
          onPage: (p, l) => {
            setPage(p);
            setLimit(l);
          },
        }}
      />
      {selected && (
        <PaymentDialog
          key={selected._id}
          bill={selected}
          onHide={() => setSelected(null)}
          onSaved={() => {
            void refetch();
          }}
        />
      )}
    </FinanceFrame>
  );
}
export function FinanceBilling() {
  const { data, loading, error, refetch } = useQuery(
    GET_COMMISSION_PERIOD_PREVIEW,
    { fetchPolicy: 'cache-and-network' }
  );
  const preview = data?.commissionPeriodPreview;
  const [confirm, setConfirm] = useState(false),
    [issueError, setIssueError] = useState('');
  const [generate, { loading: generating }] = useMutation(
    CLOSE_COMMISSION_PERIOD
  );
  const { showToast } = useToast();
  const rows = (preview?.rows ?? []).map((r: { vendor: { _id: string } }) => ({
    ...r,
    _id: r.vendor._id,
  }));
  return (
    <FinanceFrame
      title="Generate commission bills"
      description="Review unbilled delivered orders. Generate one bill per vendor and billing period, then collect it from the vendor."
    >
      <Failure error={error} retry={refetch} />
      <div className="finance-money-flow">
        <i className="pi pi-clock" />
        <p>
          Completed billing periods close automatically. Use Generate bills to
          bill the unbilled orders shown below now. Already billed orders will
          not be billed again.
        </p>
      </div>
      <div className="finance-summary-bar">
        <div>
          <span>Ready to bill</span>
          <strong>{money(preview?.unbilledCommissionTotal)}</strong>
          <small>
            {preview?.unbilledOrderCount ?? 0} delivered orders · {rows.length}{' '}
            vendors · {preview?.cycle === 'YEARLY' ? 'Yearly' : 'Monthly'}{' '}
            billing
          </small>
        </div>
        <ActionButton
          disabled={!rows.length || loading}
          onClick={() => setConfirm(true)}
        >
          Generate bills
        </ActionButton>
      </div>
      <Table
        data={rows}
        loading={loading && !data}
        minWidth="40rem"
        columns={[
          {
            propertyName: 'vendor',
            headerName: 'Vendor',
            body: (r: BillingRow) => (
              <div>
                <strong>{r.vendor.name || r.vendor.email}</strong>
                <small>{r.vendor.email}</small>
              </div>
            ),
          },
          { propertyName: 'orderCount', headerName: 'Orders', align: 'right' },
          {
            propertyName: 'grossFoodSubtotal',
            headerName: 'Food subtotal',
            align: 'right',
            body: (r: BillingRow) => money(r.grossFoodSubtotal),
          },
          {
            propertyName: 'commissionTotal',
            headerName: 'Commission to bill',
            align: 'right',
            body: (r: BillingRow) => money(r.commissionTotal),
          },
        ]}
      />
      <FormDialog
        visible={confirm}
        onHide={() => {
          if (!generating) setConfirm(false);
        }}
        title="Generate commission bills?"
        size="sm"
      >
        <p>
          Create bills for {preview?.unbilledOrderCount ?? 0} unbilled orders,
          totalling {money(preview?.unbilledCommissionTotal)}. The vendor will
          owe this amount to LocalSell.
        </p>
        {issueError && (
          <p role="alert" className="finance-error">
            {issueError}
          </p>
        )}
        <div className="finance-form-actions">
          <ActionButton
            variant="secondary"
            disabled={generating}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </ActionButton>
          <ActionButton
            disabled={generating}
            onClick={async () => {
              setIssueError('');
              try {
                const result = await generate();
                showToast({
                  type: 'success',
                  title: 'Bills generated',
                  message: `${result.data?.closeCommissionPeriod?.length ?? 0} bills created. Open Collect commission to review them.`,
                });
                setConfirm(false);
                void refetch();
              } catch (e) {
                setIssueError((e as Error).message);
              }
            }}
          >
            {generating ? 'Generating...' : 'Generate bills'}
          </ActionButton>
        </div>
      </FormDialog>
    </FinanceFrame>
  );
}
function PayoutDialog({
  vendorId,
  payables,
  onHide,
  onSaved,
}: {
  vendorId: string;
  payables: VendorPayable[];
  onHide: () => void;
  onSaved: () => void;
}) {
  const total = payables.reduce((s, p) => s + p.netPayable, 0);
  const [method, setMethod] = useState('UPI'),
    [reference, setReference] = useState(''),
    [note, setNote] = useState(''),
    [date, setDate] = useState(dateString(new Date())),
    [error, setError] = useState('');
  const [requestKey] = useState(() => crypto.randomUUID());
  const [record, { loading }] = useMutation(RECORD_VENDOR_PAYOUT);
  const { showToast } = useToast();
  return (
    <FormDialog
      visible={payables.length > 0}
      onHide={() => {
        if (!loading) onHide();
      }}
      title="Pay out vendor"
      subtitle="Record money you've already sent the vendor for these CASHFREE orders. This does not initiate a transfer."
      size="md"
    >
      <form
        className="finance-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          try {
            await record({
              variables: {
                vendorId,
                payableIds: payables.map((p) => p._id),
                method,
                reference: reference.trim(),
                note,
                paidAt: `${date}T00:00:00+05:30`,
                idempotencyKey: requestKey,
              },
            });
            showToast({
              type: 'success',
              title: 'Payout recorded',
              message: 'The selected orders are marked paid out.',
            });
            onSaved();
            onHide();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <div className="finance-callout">
          <strong>{payables[0]?.vendor?.name || payables[0]?.vendor?.email}</strong>
          <span>{payables.length} order(s)</span>
          <span>
            Net payable <b>{money(total)}</b>
          </span>
        </div>
        <div className="finance-form-grid">
          <FieldShell htmlFor="payout-method" label="Payout method">
            <Select
              inputId="payout-method"
              value={method}
              onChange={(e) => setMethod(e.value)}
            >
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CASH">Cash</option>
            </Select>
          </FieldShell>
          <CustomDateInput
            name="payout-date"
            placeholder="Paid on"
            showLabel
            value={date}
            onChange={setDate}
          />
          <FieldShell
            htmlFor="payout-reference"
            label={
              method === 'CASH' ? 'Reference (optional)' : 'Transaction reference'
            }
            required={method !== 'CASH'}
          >
            <InputText
              id="payout-reference"
              className="ls-field"
              required={method !== 'CASH'}
              maxLength={150}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </FieldShell>
        </div>
        <FieldShell htmlFor="payout-note" label="Note (optional)">
          <textarea
            id="payout-note"
            className="ls-field p-inputtextarea"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FieldShell>
        {error && (
          <p className="finance-error" role="alert">
            {error}
          </p>
        )}
        <div className="finance-form-actions">
          <ActionButton
            type="button"
            variant="secondary"
            onClick={onHide}
            disabled={loading}
          >
            Cancel
          </ActionButton>
          <ActionButton type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save payout'}
          </ActionButton>
        </div>
      </form>
    </FormDialog>
  );
}
export function FinanceVendorPayouts() {
  const [page, setPage] = useState(1),
    [limit, setLimit] = useState(25),
    [selected, setSelected] = useState<VendorPayable[]>([]),
    [confirming, setConfirming] = useState(false);
  const { data, loading, error, refetch } = useQuery(VENDOR_PAYABLES, {
    variables: { status: 'PENDING', page, limit },
    fetchPolicy: 'cache-and-network',
  });
  const payables: VendorPayable[] = data?.vendorPayables.payables ?? [];
  const mixedVendors =
    selected.length > 1 && new Set(selected.map((p) => p.vendor?._id)).size > 1;
  return (
    <FinanceFrame
      title="Vendor payables"
      description="CASHFREE orders are collected into LocalSell's own account, so unlike COD the platform owes the vendor their net share (order total minus commission). Select a vendor's orders and record the payout once you've sent the money."
    >
      <div className="finance-money-flow">
        <i className="pi pi-info-circle" />
        <p>
          <strong>Online (CASHFREE) orders only.</strong> COD orders are
          unaffected — the store already holds that cash and is billed
          commission separately under Collect commission.
        </p>
      </div>
      <Failure error={error} retry={refetch} />
      {mixedVendors && (
        <p className="finance-error" role="alert">
          Select orders from a single vendor to pay out together.
        </p>
      )}
      <Table
        data={payables}
        loading={loading && !data}
        isSelectable
        selectedData={selected}
        setSelectedData={setSelected}
        minWidth="56rem"
        rowsPerPage={limit}
        currentPage={page}
        totalRecords={data?.vendorPayables.total ?? 0}
        onPageChange={(p, l) => {
          setPage(p);
          setLimit(l);
        }}
        columns={[
          {
            propertyName: 'orderNumber',
            headerName: 'Order',
            body: (p: VendorPayable) => (
              <div>
                <strong>{p.orderNumber}</strong>
                <small>{p.storeName}</small>
              </div>
            ),
          },
          {
            propertyName: 'vendor',
            headerName: 'Vendor',
            body: (p: VendorPayable) => (
              <div>
                <strong>{p.vendor?.name || 'Vendor'}</strong>
                <small>{p.vendor?.email}</small>
              </div>
            ),
          },
          {
            propertyName: 'orderDeliveredAt',
            headerName: 'Delivered',
            body: (p: VendorPayable) => day(p.orderDeliveredAt),
          },
          {
            propertyName: 'orderAmount',
            headerName: 'Order total',
            align: 'right',
            body: (p: VendorPayable) => money(p.orderAmount),
          },
          {
            propertyName: 'commissionAmount',
            headerName: 'Commission',
            align: 'right',
            body: (p: VendorPayable) => money(p.commissionAmount),
          },
          {
            propertyName: 'netPayable',
            headerName: 'Net payable',
            align: 'right',
            body: (p: VendorPayable) => <strong>{money(p.netPayable)}</strong>,
          },
        ]}
      />
      <div className="finance-form-actions">
        <ActionButton
          disabled={selected.length === 0 || mixedVendors}
          onClick={() => setConfirming(true)}
        >
          Record payout{selected.length ? ` (${selected.length})` : ''}
        </ActionButton>
      </div>
      {confirming && selected.length > 0 && !mixedVendors && (
        <PayoutDialog
          key={selected.map((p) => p._id).join(',')}
          vendorId={selected[0].vendor!._id}
          payables={selected}
          onHide={() => setConfirming(false)}
          onSaved={() => {
            setSelected([]);
            void refetch();
          }}
        />
      )}
    </FinanceFrame>
  );
}
export function FinanceReceipts() {
  const [range, setRange] = useState({ startDate: '', endDate: '' }),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(25);
  const { data, loading, error, refetch } = useQuery(COLLECTION_RECEIPTS, {
    variables: {
      startDate: range.startDate || undefined,
      endDate: range.endDate || undefined,
      page,
      limit,
    },
    fetchPolicy: 'cache-and-network',
  });
  return (
    <FinanceFrame
      title="Payment receipts"
      description="A receipt is created for every recorded commission payment. Open one to view its bill and payment details."
    >
      <div className="ls-filter-toolbar">
        <DateRangePicker
          {...range}
          showLabel={false}
          label="Payment dates"
          placeholder="All payment dates"
          allowClear
          onChange={(startDate, endDate) => {
            setRange({ startDate, endDate });
            setPage(1);
          }}
        />
        <ActionButton variant="secondary" onClick={() => refetch()}>
          Refresh
        </ActionButton>
      </div>
      <Failure error={error} retry={refetch} />
      <ReceiptTable
        receipts={data?.commissionPayments.payments ?? []}
        loading={loading && !data}
        total={data?.commissionPayments.total ?? 0}
        page={page}
        limit={limit}
        onPage={(p, l) => {
          setPage(p);
          setLimit(l);
        }}
      />
      <p className="finance-help">
        Older payments recorded before receipt tracking remain on their
        invoices. They are not recreated as new receipts.
      </p>
    </FinanceFrame>
  );
}
export function FinanceSettings() {
  return (
    <FinanceFrame
      title="Commission settings"
      description="Set the default billing terms and invoice details. Store-specific rates are managed separately below."
    >
      <CommissionSettingsPanel />
      <section className="finance-section">
        <header>
          <div>
            <h2>Store commission rates</h2>
            <p>
              Rates apply to the food subtotal of future delivered orders.
              Existing bills keep their recorded rate.
            </p>
          </div>
        </header>
        <CommissionRateMain />
      </section>
    </FinanceFrame>
  );
}
export function FinanceBillDetail({
  id,
  vendor = false,
}: {
  id: string;
  vendor?: boolean;
}) {
  const { data, loading, error, refetch } = useQuery(COLLECTION_DETAIL, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  });
  const detail = data?.commissionBill;
  const bill: Bill | undefined = detail?.bill;
  const [collect, setCollect] = useState(false);
  return (
    <FinanceFrame
      title={bill?.invoiceNumber || 'Commission bill'}
      description="Delivered orders, commission due and payments received for this bill."
      vendor={vendor}
    >
      <Failure error={error} retry={refetch} />
      {loading && !bill ? (
        <p role="status">Loading bill...</p>
      ) : (
        bill && (
          <>
            <div className="finance-summary-bar">
              <div>
                <span>{bill.vendor?.name || bill.vendor?.email}</span>
                <strong>{money(bill.outstandingAmount)} outstanding</strong>
                <small>
                  {day(bill.periodStart)} / {day(bill.periodEnd)} /{' '}
                  {bill.orderCount} orders
                </small>
              </div>
              <div className="finance-action-row">
                <Status bill={bill} />
                <ActionButton
                  variant="secondary"
                  onClick={() => window.print()}
                >
                  Print statement
                </ActionButton>
                {!vendor && bill.outstandingAmount > 0 && (
                  <ActionButton onClick={() => setCollect(true)}>
                    Record payment
                  </ActionButton>
                )}
              </div>
            </div>
            <div className="finance-print-entity">
              <strong>{detail.invoice.platformName}</strong>
              <p>{detail.invoice.platformAddress}</p>
              {detail.invoice.platformGstin && (
                <p>GSTIN: {detail.invoice.platformGstin}</p>
              )}
            </div>
            <section className="finance-section">
              <header>
                <div>
                  <h2>Order breakdown</h2>
                  <p>Commission excludes delivery fees, tips and tax.</p>
                </div>
              </header>
              <Table
                data={detail.records}
                minWidth="46rem"
                columns={[
                  { propertyName: 'orderNumber', headerName: 'Order' },
                  { propertyName: 'storeName', headerName: 'Store' },
                  {
                    propertyName: 'orderDeliveredAt',
                    headerName: 'Delivered',
                    body: (r: CommissionOrder) => day(r.orderDeliveredAt),
                  },
                  {
                    propertyName: 'foodSubtotal',
                    headerName: 'Food subtotal',
                    align: 'right',
                    body: (r: CommissionOrder) => money(r.foodSubtotal),
                  },
                  {
                    propertyName: 'commissionRate',
                    headerName: 'Rate',
                    align: 'right',
                    body: (r: CommissionOrder) => `${r.commissionRate}%`,
                  },
                  {
                    propertyName: 'commissionAmount',
                    headerName: 'Commission',
                    align: 'right',
                    body: (r: CommissionOrder) => money(r.commissionAmount),
                  },
                ]}
              />
            </section>
            <section className="finance-section">
              <header>
                <div>
                  <h2>Payments & receipts</h2>
                  <p>
                    {money(bill.paidAmount)} received against{' '}
                    {money(bill.commissionTotal)} commission.
                  </p>
                </div>
              </header>
              {bill.payments?.length ? (
                bill.payments.map((r) => (
                  <article
                    className="finance-receipt"
                    id={`receipt-${r._id}`}
                    key={r._id}
                  >
                    <header>
                      <strong>{r.receiptNumber}</strong>
                      <b>{money(r.amount)}</b>
                    </header>
                    <dl>
                      <div>
                        <dt>Received on</dt>
                        <dd>{day(r.receivedAt)}</dd>
                      </div>
                      <div>
                        <dt>Method</dt>
                        <dd>{r.method.replace('_', ' ')}</dd>
                      </div>
                      <div>
                        <dt>Reference</dt>
                        <dd>{r.reference || 'Cash receipt'}</dd>
                      </div>
                    </dl>
                    {r.note && <p>{r.note}</p>}
                  </article>
                ))
              ) : (
                <p className="finance-empty">
                  {(bill.paidAmount ?? 0) > 0
                    ? `Legacy payment of ${money(bill.paidAmount)} recorded on ${day(bill.paidAt)}. No individual receipt was stored.`
                    : 'No payments recorded for this bill.'}
                </p>
              )}
            </section>
            {collect && (
              <PaymentDialog
                bill={bill}
                onHide={() => setCollect(false)}
                onSaved={() => void refetch()}
              />
            )}
          </>
        )
      )}
    </FinanceFrame>
  );
}
export { BillTable, ReceiptTable };
