'use client';

import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_MY_PAYOUT_HISTORY } from '@/lib/api/graphql';
import Table from '@/lib/ui/useable-components/table';
import { IMyPayoutHistoryResponse, IPayoutRunItemRow } from '@/lib/utils/interfaces';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const statusClass: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-200 text-gray-600',
};

export default function MyPayoutsMain() {
  const t = useTranslations();
  const { data, loading } = useQuery<IMyPayoutHistoryResponse>(GET_MY_PAYOUT_HISTORY, {
    variables: { limit: 50 },
    fetchPolicy: 'cache-and-network',
  });
  const items = data?.myPayoutHistory?.items ?? [];

  const printStatement = (item: IPayoutRunItemRow) => {
    const s = item.statement;
    if (!s) return;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${s.statementNumber}</title>
      <style>body{font:13px/1.5 system-ui,sans-serif;padding:40px;color:#111}h1{font-size:20px;margin:0 0 4px}
      .muted{color:#666}.tot{font-weight:700;font-size:15px}.row{display:flex;justify-content:space-between;gap:40px;margin-top:20px}
      table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}</style>
      </head><body>
      <h1>${s.platformName}</h1>
      <div class="muted">${s.platformAddress ?? ''}${s.platformGstin ? ` · GSTIN ${s.platformGstin}` : ''}</div>
      <div class="row">
        <div><b>Statement</b> ${s.statementNumber}<br/><span class="muted">Issued ${day(s.issuedOn)}</span><br/><span class="muted">Run ${s.runLabel} · ${s.periodLabel}</span></div>
        <div style="text-align:right"><b>Paid to</b><br/>${s.payeeName}</div>
      </div>
      <table><tbody>
        <tr><td>Wallet balance</td><td style="text-align:right">${money(s.walletBalance)}</td></tr>
        <tr><td>Held cash (deducted)</td><td style="text-align:right">${money(s.heldCash)}</td></tr>
        <tr><td>Method</td><td style="text-align:right">${s.method ?? '—'}</td></tr>
        <tr><td>Reference</td><td style="text-align:right">${s.reference ?? '—'}</td></tr>
      </tbody></table>
      <div class="row"><div></div><div class="tot">Amount paid: ${money(s.amount)} <span class="muted">(${s.status})</span></div></div>
      <script>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="flex flex-col gap-5 p-3">
      <div className="rounded border p-4 text-sm dark:border-dark-600">
        <p className="text-gray-500">
          {t('Every payout run that includes your store — settled from your wallet balance.')}
        </p>
      </div>

      <Table
        data={loading ? [] : items}
        loading={loading}
        moduleName="MyPayouts"
        columns={[
          {
            headerName: t('Period'),
            propertyName: 'periodStart',
            body: (i: IPayoutRunItemRow) => `${day(i.periodStart)} – ${day(i.periodEnd)}`,
          },
          { headerName: t('Run'), propertyName: 'runLabel' },
          {
            headerName: t('Amount'),
            propertyName: 'amount',
            body: (i: IPayoutRunItemRow) => <span className="font-semibold">{money(i.amount)}</span>,
          },
          {
            headerName: t('Status'),
            propertyName: 'status',
            body: (i: IPayoutRunItemRow) => (
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[i.status] ?? ''}`}>
                {t(i.status)}
              </span>
            ),
          },
          {
            headerName: t('Paid on'),
            propertyName: 'paidAt',
            body: (i: IPayoutRunItemRow) => day(i.paidAt),
          },
          {
            propertyName: 'actions',
            body: (i: IPayoutRunItemRow) => (
              <button
                onClick={() => printStatement(i)}
                className="rounded border px-3 py-1 text-xs dark:border-dark-600"
              >
                {t('Print statement')}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
