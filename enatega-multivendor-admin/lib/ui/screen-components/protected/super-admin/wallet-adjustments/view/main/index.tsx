'use client';

import { useContext, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import { GET_WALLET_ADJUSTMENTS, ADJUST_WALLET, GET_RESTAURANTS, GET_RIDERS } from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import Table from '@/lib/ui/useable-components/table';
import { IWalletAdjustmentRow, IWalletAdjustmentsResponse } from '@/lib/utils/interfaces';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d: string) => new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const REASONS = ['goodwill', 'chargeback', 'correction', 'penalty', 'other'];

export default function WalletAdjustmentsMain() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const [subjectType, setSubjectType] = useState<'STORE' | 'RIDER'>('STORE');
  const [subjectId, setSubjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('goodwill');
  const [note, setNote] = useState('');

  const { data, loading, refetch } = useQuery<IWalletAdjustmentsResponse>(GET_WALLET_ADJUSTMENTS, {
    variables: { limit: 50 },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.walletAdjustments?.adjustments ?? [];

  const { data: storeData } = useQuery(GET_RESTAURANTS);
  const { data: riderData } = useQuery(GET_RIDERS);
  const stores = (storeData?.restaurants ?? []) as { _id: string; name: string }[];
  const riders = ((riderData?.riders ?? []) as { _id: string; name: string | null; username: string | null }[]).map(
    (r) => ({ _id: r._id, name: r.name || r.username || r._id }),
  );
  const options = subjectType === 'STORE' ? stores : riders;

  const [adjust, { loading: saving }] = useMutation(ADJUST_WALLET);

  const submit = async () => {
    const parsed = parseFloat(amount);
    if (!subjectId || Number.isNaN(parsed) || parsed === 0) {
      showToast({ type: 'error', title: t('Error'), message: t('Pick a payee and a non-zero amount'), duration: 2500 });
      return;
    }
    try {
      await adjust({ variables: { subjectType, subjectId, amount: parsed, reason, note: note || null } });
      showToast({ type: 'success', title: t('Adjustments'), message: t('Wallet adjusted'), duration: 2000 });
      setAmount('');
      setNote('');
      refetch();
    } catch (e) {
      showToast({ type: 'error', title: t('Error'), message: (e as Error).message, duration: 2800 });
    }
  };

  return (
    <div className="p-3">
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded border p-3 text-sm dark:border-dark-600">
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('Payee type')}</span>
          <select
            value={subjectType}
            onChange={(e) => {
              setSubjectType(e.target.value as 'STORE' | 'RIDER');
              setSubjectId('');
            }}
            className="h-10 w-32 rounded border border-gray-300 px-2 dark:bg-dark-950"
          >
            <option value="STORE">{t('Store')}</option>
            <option value="RIDER">{t('Rider')}</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{subjectType === 'STORE' ? t('Store') : t('Rider')}</span>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="h-10 w-52 rounded border border-gray-300 px-2 dark:bg-dark-950">
            <option value="">{t('Select')}…</option>
            {options.map((o) => (
              <option key={o._id} value={o._id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('Amount')} (± ₹)</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="-250"
            className="h-10 w-28 rounded border border-gray-300 px-2 dark:bg-dark-950"
          />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-gray-500">{t('Reason')}</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-36 rounded border border-gray-300 px-2 capitalize dark:bg-dark-950">
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {t(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col">
          <span className="mb-1 text-gray-500">{t('Note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
        </label>
        <button onClick={submit} disabled={saving} className="h-10 rounded bg-black px-4 text-white disabled:opacity-50">
          {t('Apply')}
        </button>
      </div>

      <Table
        data={loading ? [] : rows}
        loading={loading}
        moduleName="WalletAdjustments"
        columns={[
          { headerName: t('Date'), propertyName: 'createdAt', body: (r: IWalletAdjustmentRow) => day(r.createdAt) },
          { headerName: t('Payee'), propertyName: 'subjectName', body: (r: IWalletAdjustmentRow) => `${r.subjectName ?? r.subjectId} (${r.subjectType})` },
          {
            headerName: t('Amount'),
            propertyName: 'amount',
            body: (r: IWalletAdjustmentRow) => (
              <span className={`font-semibold ${r.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {r.amount >= 0 ? '+' : ''}
                {money(r.amount)}
              </span>
            ),
          },
          { headerName: t('Reason'), propertyName: 'reason', body: (r: IWalletAdjustmentRow) => <span className="capitalize">{r.reason}</span> },
          { headerName: t('Note'), propertyName: 'note' },
          { headerName: t('By'), propertyName: 'createdByEmail' },
        ]}
      />
    </div>
  );
}
