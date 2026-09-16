'use client';
import { gql, useQuery } from '@apollo/client';
import { useState } from 'react';
import {
  FinanceFrame,
  BillTable,
  ChannelBadge,
} from '@/lib/ui/screens/super-admin/management/finance/workspace';
import {
  BILL_FIELDS,
  VENDOR_PAYABLE_FIELDS,
  Bill,
  VendorPayable,
  money,
  day,
} from '@/lib/ui/screens/super-admin/management/finance/operations';
import Select from '@/lib/ui/useable-components/custom-dropdown/select';
import Table from '@/lib/ui/useable-components/table';
const SUMMARY = gql`
  query VendorCollectionSummary {
    myCommissionSummary {
      cycle
      currentPeriodCommission
      currentPeriodOrderCount
      outstandingTotal
      payoutPendingTotal
      netBalance
      bills {
        ...CollectionBill
      }
    }
  }
  ${BILL_FIELDS}
`;
const MY_PAYABLES = gql`
  query MyVendorPayables($status: String) {
    vendorPayables(status: $status, limit: 100) {
      total
      payables {
        ...VendorPayableRow
      }
    }
  }
  ${VENDOR_PAYABLE_FIELDS}
`;
function PayoutsSection() {
  const { data: pendingData, loading: pendingLoading } = useQuery(
    MY_PAYABLES,
    { variables: { status: 'PENDING' }, fetchPolicy: 'cache-and-network' }
  );
  const { data: paidData, loading: paidLoading } = useQuery(MY_PAYABLES, {
    variables: { status: 'PAID' },
    fetchPolicy: 'cache-and-network',
  });
  const pending: VendorPayable[] = pendingData?.vendorPayables.payables ?? [];
  const paid: VendorPayable[] = paidData?.vendorPayables.payables ?? [];
  const pendingTotal = pending.reduce((s, p) => s + p.netPayable, 0);
  return (
    <section className="finance-section">
      <header>
        <div>
          <ChannelBadge channel="online" />
          <h2>Payouts from LocalSell</h2>
          <p>
            Online (Cashfree) orders are collected into LocalSell&apos;s own
            account, so unlike your other stores&apos; direct payments,
            LocalSell owes you your share of these orders — the order total
            minus commission. This is separate from the commission you pay
            above.
          </p>
        </div>
      </header>
      <div className="finance-metrics">
        <section>
          <span>Owed to you</span>
          <strong>{money(pendingTotal)}</strong>
          <small>{pending.length} online order(s) not yet paid out</small>
        </section>
      </div>
      <Table
        data={[...pending, ...paid]}
        loading={pendingLoading || paidLoading}
        minWidth="44rem"
        columns={[
          { propertyName: 'orderNumber', headerName: 'Order' },
          { propertyName: 'storeName', headerName: 'Store' },
          {
            propertyName: 'orderDeliveredAt',
            headerName: 'Delivered',
            body: (p: VendorPayable) => day(p.orderDeliveredAt),
          },
          {
            propertyName: 'netPayable',
            headerName: 'You receive',
            align: 'right',
            body: (p: VendorPayable) => <strong>{money(p.netPayable)}</strong>,
          },
          {
            propertyName: 'status',
            headerName: 'Status',
            body: (p: VendorPayable) => (
              <span
                className={`finance-status finance-status-${p.status.toLowerCase()}`}
              >
                {p.status === 'PAID' ? 'Paid' : 'Pending'}
              </span>
            ),
          },
        ]}
      />
    </section>
  );
}
export default function MyCommissionMain() {
  const { data, loading, error, refetch } = useQuery(SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.myCommissionSummary;
  const [status, setStatus] = useState('');
  const bills: Bill[] = (summary?.bills ?? []).filter(
    (b: Bill) => !status || b.status === status
  );
  return (
    <FinanceFrame
      vendor
      title="Bills & payments"
      description="Review the commission your stores owe LocalSell and check recorded payments."
    >
      <div className="finance-money-flow">
        <p>
          <strong>Your stores receive customer payments directly.</strong> Pay
          LocalSell the commission shown on your bills using the payment details
          agreed with your account contact. After LocalSell records your
          payment, the remaining balance and receipt appear on the bill.
        </p>
      </div>
      {summary && Math.abs(summary.netBalance) >= 0.01 && (
        <div className="finance-summary-bar">
          <div>
            <span>Net position</span>
            <strong
              className={
                summary.netBalance > 0 ? 'finance-net-owe' : 'finance-net-collect'
              }
            >
              {money(Math.abs(summary.netBalance))}
            </strong>
            <small>
              {summary.netBalance > 0
                ? 'LocalSell owes you this much overall (Cashfree payouts pending minus commission you owe).'
                : 'You owe LocalSell this much overall (commission owed minus Cashfree payouts pending).'}
            </small>
          </div>
        </div>
      )}
      {error && (
        <div role="alert" className="finance-error">
          {error.message}
          <button onClick={() => refetch()}>Retry</button>
        </div>
      )}
      <div className="finance-metrics">
        <section>
          <span>Outstanding commission</span>
          <strong>{money(summary?.outstandingTotal)}</strong>
          <small>Amount still to pay on issued bills</small>
        </section>
        <section>
          <span>Unbilled commission</span>
          <strong>{money(summary?.currentPeriodCommission)}</strong>
          <small>
            {summary?.currentPeriodOrderCount ?? 0} delivered orders awaiting a
            bill
          </small>
        </section>
        <section>
          <span>Billing cycle</span>
          <strong>{summary?.cycle === 'YEARLY' ? 'Yearly' : 'Monthly'}</strong>
          <small>Open each bill for orders and payment receipts</small>
        </section>
      </div>
      <div className="ls-filter-toolbar">
        <Select
          aria-label="Bill status"
          value={status}
          onChange={(e) => setStatus(e.value)}
        >
          <option value="">All bills</option>
          <option value="PENDING">Unpaid & part paid</option>
          <option value="PAID">Paid</option>
          <option value="WAIVED">Waived</option>
        </Select>
      </div>
      <BillTable vendor bills={bills} loading={loading && !data} />
      <PayoutsSection />
    </FinanceFrame>
  );
}
