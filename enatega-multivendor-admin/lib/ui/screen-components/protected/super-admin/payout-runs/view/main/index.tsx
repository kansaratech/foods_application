'use client';

import { useContext, useState } from 'react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Dialog } from 'primereact/dialog';

import {
  GET_PAYOUT_RUNS,
  GET_PAYOUT_RUN,
  GET_PAYOUT_RUN_CSV,
  CREATE_PAYOUT_RUN,
  MARK_PAYOUT_ITEM_PAID,
  SKIP_PAYOUT_ITEM,
  COMPLETE_PAYOUT_RUN,
} from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import Table from '@/lib/ui/useable-components/table';
import {
  IPayoutRun,
  IPayoutRunItemRow,
  IPayoutRunResponse,
  IPayoutRunsResponse,
} from '@/lib/utils/interfaces';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusChip: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-200 text-gray-600',
};

export default function PayoutRunsMain() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const client = useApolloClient();

  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [minAmount, setMinAmount] = useState('1');
  const [includeStores, setIncludeStores] = useState(true);
  const [includeRiders, setIncludeRiders] = useState(true);
  const [payItem, setPayItem] = useState<IPayoutRunItemRow | null>(null);
  const [method, setMethod] = useState('bank');
  const [reference, setReference] = useState('');

  const { data, loading, refetch } = useQuery<IPayoutRunsResponse>(GET_PAYOUT_RUNS, {
    variables: { limit: 50 },
    fetchPolicy: 'cache-and-network',
  });
  const runs = data?.payoutRuns?.runs ?? [];

  const { data: runData, refetch: refetchRun } = useQuery<IPayoutRunResponse>(GET_PAYOUT_RUN, {
    variables: { id: openRunId },
    skip: !openRunId,
    fetchPolicy: 'cache-and-network',
  });
  const run = runData?.payoutRun;

  const [createRun, { loading: creating }] = useMutation(CREATE_PAYOUT_RUN);
  const [markPaid, { loading: paying }] = useMutation(MARK_PAYOUT_ITEM_PAID);
  const [skipItem] = useMutation(SKIP_PAYOUT_ITEM);
  const [completeRun, { loading: completing }] = useMutation(COMPLETE_PAYOUT_RUN);

  const err = (e: unknown) =>
    showToast({ type: 'error', title: t('Error'), message: (e as Error).message || t('Something went wrong'), duration: 2800 });

  const doCreate = async () => {
    try {
      const res = await createRun({
        variables: {
          minAmount: parseFloat(minAmount) || 1,
          includeStores,
          includeRiders,
        },
      });
      setShowCreate(false);
      await refetch();
      const id = res.data?.createPayoutRun?._id;
      if (id) setOpenRunId(id);
      showToast({ type: 'success', title: t('Payouts'), message: t('Payout run created'), duration: 2000 });
    } catch (e) {
      err(e);
    }
  };

  const doMarkPaid = async () => {
    if (!payItem) return;
    try {
      await markPaid({ variables: { id: payItem._id, method, reference: reference || null } });
      setPayItem(null);
      setReference('');
      refetchRun();
      showToast({ type: 'success', title: t('Payouts'), message: t('Marked paid'), duration: 1800 });
    } catch (e) {
      err(e);
    }
  };

  const doSkip = async (item: IPayoutRunItemRow) => {
    try {
      await skipItem({ variables: { id: item._id } });
      refetchRun();
    } catch (e) {
      err(e);
    }
  };

  const doComplete = async () => {
    if (!run) return;
    try {
      await completeRun({ variables: { id: run._id } });
      refetchRun();
      refetch();
      showToast({ type: 'success', title: t('Payouts'), message: t('Run completed'), duration: 1800 });
    } catch (e) {
      err(e);
    }
  };

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
        <div style="text-align:right"><b>Paid to</b><br/>${s.payeeName}<br/><span class="muted">${s.payeeType}</span></div>
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

  const downloadCsv = async () => {
    if (!run) return;
    const res = await client.query({ query: GET_PAYOUT_RUN_CSV, variables: { id: run._id }, fetchPolicy: 'network-only' });
    const csv: string = res.data?.payoutRunCsv ?? '';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run.label.replace(/[^a-z0-9]+/gi, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('payout_runs_help')}</p>
        <button onClick={() => setShowCreate(true)} className="rounded bg-black px-4 py-2 text-sm text-white">
          {t('New payout run')}
        </button>
      </div>

      <Table
        data={loading ? [] : runs}
        loading={loading}
        moduleName="PayoutRuns"
        handleRowClick={(e) => setOpenRunId((e.data as IPayoutRun)?._id ?? null)}
        columns={[
          { headerName: t('Run'), propertyName: 'label' },
          {
            headerName: t('Period'),
            propertyName: 'periodStart',
            body: (r: IPayoutRun) => `${day(r.periodStart)} – ${day(r.periodEnd)}`,
          },
          { headerName: t('Payees'), propertyName: 'itemCount' },
          { headerName: t('Gross'), propertyName: 'grossTotal', body: (r: IPayoutRun) => money(r.grossTotal) },
          { headerName: t('Paid'), propertyName: 'paidTotal', body: (r: IPayoutRun) => money(r.paidTotal) },
          {
            headerName: t('Status'),
            propertyName: 'status',
            body: (r: IPayoutRun) => (
              <span className={`rounded px-2 py-0.5 text-xs ${statusChip[r.status] ?? ''}`}>{r.status}</span>
            ),
          },
        ]}
      />

      {/* Create dialog */}
      <Dialog header={t('New payout run')} visible={showCreate} onHide={() => setShowCreate(false)} style={{ width: '28rem', maxWidth: '95vw' }}>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col">
            <span className="mb-1 text-gray-500">{t('Minimum balance to include')}</span>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeStores} onChange={(e) => setIncludeStores(e.target.checked)} />
            {t('Include stores')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeRiders} onChange={(e) => setIncludeRiders(e.target.checked)} />
            {t('Include riders')} ({t('net of held COD cash')})
          </label>
          <button onClick={doCreate} disabled={creating} className="mt-2 h-10 rounded bg-black text-white disabled:opacity-50">
            {creating ? t('Creating') : t('Create run')}
          </button>
        </div>
      </Dialog>

      {/* Run detail dialog */}
      <Dialog
        header={run ? run.label : t('Payout run')}
        visible={!!openRunId}
        onHide={() => setOpenRunId(null)}
        style={{ width: '52rem', maxWidth: '96vw' }}
      >
        {run && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span><b>{t('Gross')}:</b> {money(run.grossTotal)}</span>
              <span><b>{t('Paid')}:</b> {money(run.paidTotal)}</span>
              <span className={`rounded px-2 py-0.5 text-xs ${statusChip[run.status] ?? ''}`}>{run.status}</span>
              <div className="ml-auto flex gap-2">
                <button onClick={downloadCsv} className="rounded border px-3 py-1 text-xs dark:border-dark-600">
                  {t('Download CSV')}
                </button>
                {run.status === 'OPEN' && (
                  <button onClick={doComplete} disabled={completing} className="rounded bg-green-600 px-3 py-1 text-xs text-white disabled:opacity-50">
                    {t('Complete run')}
                  </button>
                )}
              </div>
            </div>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-1">{t('Payee')}</th>
                  <th className="py-1">{t('Type')}</th>
                  <th className="py-1 text-right">{t('Wallet')}</th>
                  <th className="py-1 text-right">{t('Held cash')}</th>
                  <th className="py-1 text-right">{t('Payout')}</th>
                  <th className="py-1">{t('Status')}</th>
                  <th className="py-1">{t('Reference')}</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {run.items?.map((i) => (
                  <tr key={i._id} className="border-b border-dashed">
                    <td className="py-1">{i.payeeName}</td>
                    <td className="py-1">{i.subjectType}</td>
                    <td className="py-1 text-right">{money(i.walletBalance)}</td>
                    <td className="py-1 text-right">{i.heldCash ? money(i.heldCash) : '—'}</td>
                    <td className="py-1 text-right font-semibold">{money(i.amount)}</td>
                    <td className="py-1">
                      <span className={`rounded px-1.5 py-0.5 ${statusChip[i.status] ?? ''}`}>{i.status}</span>
                    </td>
                    <td className="py-1">{i.reference || '—'}</td>
                    <td className="py-1 text-right">
                      <span className="flex justify-end gap-1">
                        {i.status === 'PENDING' && (
                          <>
                            <button onClick={() => setPayItem(i)} className="rounded bg-black px-2 py-0.5 text-white">
                              {t('Pay')}
                            </button>
                            <button onClick={() => doSkip(i)} className="rounded border px-2 py-0.5 dark:border-dark-600">
                              {t('Skip')}
                            </button>
                          </>
                        )}
                        <button onClick={() => printStatement(i)} className="rounded border px-2 py-0.5 dark:border-dark-600">
                          {t('Print statement')}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>

      {/* Mark paid dialog */}
      <Dialog header={t('Record payment')} visible={!!payItem} onHide={() => setPayItem(null)} style={{ width: '24rem', maxWidth: '95vw' }}>
        {payItem && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {payItem.payeeName} — <b>{money(payItem.amount)}</b>
            </p>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-500">{t('Method')}</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950">
                <option value="bank">{t('Bank')}</option>
                <option value="upi">UPI</option>
                <option value="cash">{t('Cash')}</option>
              </select>
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-500">{t('Reference')} ({t('optional')})</span>
              <input value={reference} onChange={(e) => setReference(e.target.value)} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
            </label>
            <button onClick={doMarkPaid} disabled={paying} className="mt-1 h-10 rounded bg-green-600 text-white disabled:opacity-50">
              {t('Confirm payment')}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
