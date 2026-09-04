'use client';

import { useContext, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Dialog } from 'primereact/dialog';

import {
  GET_RIDER_CASH_OUTSTANDING,
  GET_RIDER_CASH_SUMMARY,
  RECORD_RIDER_CASH_REMITTANCE,
  CONFIRM_RIDER_CASH_DEPOSIT,
} from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import Table from '@/lib/ui/useable-components/table';
import {
  IRiderCashOutstandingResponse,
  IRiderCashOutstandingRow,
  IRiderCashSummaryResponse,
} from '@/lib/utils/interfaces';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function RiderCashMain() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const [openRiderId, setOpenRiderId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const { data, loading, refetch } = useQuery<IRiderCashOutstandingResponse>(GET_RIDER_CASH_OUTSTANDING, {
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.riderCashOutstanding ?? [];
  const grandTotal = rows.reduce((s, r) => s + r.outstanding, 0);

  const { data: sumData, refetch: refetchSummary } = useQuery<IRiderCashSummaryResponse>(GET_RIDER_CASH_SUMMARY, {
    variables: { riderId: openRiderId },
    skip: !openRiderId,
    fetchPolicy: 'cache-and-network',
  });
  const summary = sumData?.riderCashSummary;

  const [recordRemittance, { loading: recording }] = useMutation(RECORD_RIDER_CASH_REMITTANCE);
  const [confirmDeposit, { loading: confirming }] = useMutation(CONFIRM_RIDER_CASH_DEPOSIT);

  const reviewDeposit = async (id: string, approve: boolean) => {
    try {
      await confirmDeposit({ variables: { id, approve } });
      showToast({
        type: 'success',
        title: t('Rider cash'),
        message: approve ? t('Deposit confirmed') : t('Deposit rejected'),
        duration: 1800,
      });
      refetch();
      refetchSummary();
    } catch (e) {
      showToast({ type: 'error', title: t('Error'), message: (e as Error).message, duration: 2800 });
    }
  };

  const submitRemittance = async () => {
    if (!openRiderId) return;
    try {
      const parsed = parseFloat(amount);
      await recordRemittance({
        variables: {
          riderId: openRiderId,
          amount: !Number.isNaN(parsed) && parsed > 0 ? parsed : null,
          method,
        },
      });
      showToast({ type: 'success', title: t('Rider cash'), message: t('Remittance recorded'), duration: 2000 });
      setAmount('');
      refetch();
      refetchSummary();
    } catch (e) {
      showToast({
        type: 'error',
        title: t('Error'),
        message: (e as Error).message || t('Could not record the remittance'),
        duration: 2800,
      });
    }
  };

  return (
    <div className="p-3">
      <div className="mb-3 rounded border p-4 text-sm dark:border-dark-600">
        <p className="text-gray-500">{t('rider_cash_help')}</p>
        <p className="mt-1 text-lg font-semibold">
          {t('Total outstanding with riders')}: {money(grandTotal)}
        </p>
      </div>

      <Table
        data={loading ? [] : rows.map((r) => ({ ...r, _id: r.rider._id }))}
        loading={loading}
        moduleName="RiderCash"
        handleRowClick={(e) => setOpenRiderId((e.data as IRiderCashOutstandingRow)?.rider?._id ?? null)}
        columns={[
          {
            headerName: t('Rider'),
            propertyName: 'rider',
            body: (r: IRiderCashOutstandingRow) => r.rider.name || r.rider.username || '—',
          },
          { headerName: t('Unremitted deliveries'), propertyName: 'entryCount' },
          {
            headerName: t('Oldest'),
            propertyName: 'oldestUnremittedAt',
            body: (r: IRiderCashOutstandingRow) => day(r.oldestUnremittedAt),
          },
          {
            headerName: t('Outstanding'),
            propertyName: 'outstanding',
            body: (r: IRiderCashOutstandingRow) => <span className="font-semibold">{money(r.outstanding)}</span>,
          },
          {
            headerName: t('To confirm'),
            propertyName: 'pendingDepositTotal',
            body: (r: IRiderCashOutstandingRow) =>
              r.pendingDepositCount ? (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {r.pendingDepositCount} · {money(r.pendingDepositTotal)}
                </span>
              ) : (
                '—'
              ),
          },
          {
            headerName: t('Actions'),
            propertyName: 'actions',
            body: (r: IRiderCashOutstandingRow) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenRiderId(r.rider._id);
                }}
                className="rounded bg-black px-3 py-1 text-xs text-white"
              >
                {t('Record remittance')}
              </button>
            ),
          },
        ]}
      />

      <Dialog
        header={summary ? summary.rider.name || summary.rider.username || t('Rider cash') : t('Rider cash')}
        visible={!!openRiderId}
        onHide={() => setOpenRiderId(null)}
        style={{ width: '44rem', maxWidth: '95vw' }}
      >
        {summary && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              <span><b>{t('Outstanding')}:</b> {money(summary.outstanding)}</span>
              <span><b>{t('Cash limit')}:</b> {money(summary.cashLimit)}</span>
              <span><b>{t('Wallet balance')}:</b> {money(summary.walletBalance)}</span>
              <span><b>{t('Available to withdraw')}:</b> {money(summary.availableToWithdraw)}</span>
              <span><b>{t('Lifetime remitted')}:</b> {money(summary.lifetimeRemitted)}</span>
            </div>

            {summary.remittances.some((r) => r.status === 'PENDING') && (
              <div className="rounded border border-amber-300 bg-amber-50 p-3 dark:bg-dark-900">
                <p className="mb-2 font-semibold">{t('Deposits awaiting confirmation')}</p>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {summary.remittances
                      .filter((r) => r.status === 'PENDING')
                      .map((r) => (
                        <tr key={r._id} className="border-b border-dashed">
                          <td className="py-1">{day(r.createdAt)}</td>
                          <td className="py-1 capitalize">{r.method || '—'}</td>
                          <td className="py-1">{r.reference || '—'}</td>
                          <td className="py-1 text-right font-semibold">{money(r.amount)}</td>
                          <td className="py-1 text-right">
                            <span className="flex justify-end gap-1">
                              <button
                                onClick={() => reviewDeposit(r._id, true)}
                                disabled={confirming}
                                className="rounded bg-green-600 px-2 py-0.5 text-white disabled:opacity-50"
                              >
                                {t('Confirm')}
                              </button>
                              <button
                                onClick={() => reviewDeposit(r._id, false)}
                                disabled={confirming}
                                className="rounded border px-2 py-0.5 dark:border-dark-600"
                              >
                                {t('Reject')}
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {summary.outstanding > 0 && (
              <div className="flex flex-wrap items-end gap-3 rounded bg-gray-50 p-3 dark:bg-dark-900">
                <label className="flex flex-col">
                  <span className="mb-1 text-gray-500">{t('Amount')} ({t('blank = settle all')})</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={money(summary.outstanding)}
                    className="h-10 w-40 rounded border border-gray-300 px-2 dark:bg-dark-950"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="mb-1 text-gray-500">{t('Method')}</span>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="h-10 w-32 rounded border border-gray-300 px-2 dark:bg-dark-950"
                  >
                    <option value="cash">{t('Cash')}</option>
                    <option value="bank">{t('Bank')}</option>
                    <option value="upi">UPI</option>
                  </select>
                </label>
                <button
                  onClick={submitRemittance}
                  disabled={recording}
                  className="h-10 rounded bg-green-600 px-4 text-white disabled:opacity-50"
                >
                  {t('Record remittance')}
                </button>
              </div>
            )}

            <div>
              <p className="mb-1 font-semibold">{t('Unremitted deliveries')}</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-1">{t('Order')}</th>
                    <th className="py-1">{t('Delivered')}</th>
                    <th className="py-1 text-right">{t('Order total (cash)')}</th>
                    <th className="py-1 text-right">{t('Rider earns (wallet)')}</th>
                    <th className="py-1 text-right">{t('Deposit owed')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.entries.filter((e) => !e.remitted).map((e) => (
                    <tr key={e._id} className="border-b border-dashed">
                      <td className="py-1">{e.orderNumber}</td>
                      <td className="py-1">{day(e.deliveredAt)}</td>
                      <td className="py-1 text-right">{money(e.collectedTotal)}</td>
                      <td className="py-1 text-right">{money(e.riderKeeps)}</td>
                      <td className="py-1 text-right font-semibold">{money(e.owedToPlatform)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.remittances.length > 0 && (
              <div>
                <p className="mb-1 font-semibold">{t('Remittance history')}</p>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-1">{t('Date')}</th>
                      <th className="py-1">{t('Method')}</th>
                      <th className="py-1 text-right">{t('Deliveries')}</th>
                      <th className="py-1 text-right">{t('Amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.remittances.map((r) => (
                      <tr key={r._id} className="border-b border-dashed">
                        <td className="py-1">{day(r.createdAt)}</td>
                        <td className="py-1 capitalize">
                          {r.method || '—'}
                          {r.status !== 'CONFIRMED' && (
                            <span className="ml-1 rounded bg-gray-200 px-1 text-[10px] uppercase text-gray-600">{r.status}</span>
                          )}
                        </td>
                        <td className="py-1 text-right">{r.entryCount}</td>
                        <td className="py-1 text-right font-semibold">{money(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
